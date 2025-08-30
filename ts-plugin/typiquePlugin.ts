import ts from 'typescript/lib/tsserverlibrary'
import type { ObjectType, StringLiteralType, Path, server, Statement, SatisfiesExpression, SourceFile, Symbol, NumberLiteralType, Type, TupleType, LineAndCharacter, Diagnostic, TypeReferenceNode, Node, UnionType, DiagnosticRelatedInformation, StringLiteralLike, VariableStatement } from 'typescript/lib/tsserverlibrary'
import fs from 'node:fs'
import path from 'node:path'
import { areWritersEqual, BufferWriter, defaultBufSize } from './BufferWriter'
import { camelCaseToKebabCase, findClassNameProtectedRanges, getVarNameVariants } from './util'
import { parseClassNamePattern, renderClassNamesForMultipleVars, renderClassNamesForOneVar, RenderCommonParams } from './classNamePattern'


export type TypiquePluginState = {
  info: server.PluginCreateInfo
  filesState: Map<Path, FileState>
  classNamesToFileSpans: Map<string, FileSpan[]>
  writing: Promise<void>
}

type FileState = {
  version: string
  css: BufferWriter | undefined
  classNames: string[] | undefined
  diagnostics: Diagnostic[]
}

type FileSpan = {
  fileName: string
  path: Path // lowercased by TS on OS X and Windows
  span: Span
}

type Span = {
  start: LineAndCharacter
  end: LineAndCharacter
}

const diagHeader = {
  category: ts.DiagnosticCategory.Error,
  code: 0,
  source: 'typique',
}

function checker(info: server.PluginCreateInfo) {
  return info.languageService.getProgram()?.getTypeChecker()
}

export function log(info: server.PluginCreateInfo, msg: string, startTime: number) {
  info.project.projectService.logger.info(`TypiquePlugin:: ${msg} :: elapsed ${performance.now() - startTime} ms :: Project ${info.project.getProjectName()}`)
}

export function createTypiquePluginState(info: server.PluginCreateInfo): TypiquePluginState {
  return {
    info,
    filesState: new Map(),
    classNamesToFileSpans: new Map(),
    writing: Promise.resolve(),
  }
}

export function projectUpdated(p: TypiquePluginState) {
  const cssUpdated = updateFilesState(p.info, p.filesState, p.classNamesToFileSpans);

  const fileName = path.join(path.dirname(p.info.project.getProjectName()), 'typique-output.css')
  if (!cssUpdated) {
    log(p.info, `${fileName} is up-to-date`, performance.now())
    return
  }

  const prevWriting = p.writing
  p.writing = (async () => {
    await prevWriting
    const started = performance.now()
    const h = await fs.promises.open(fileName, 'w')
    let written = 0
    for (const fileState of p.filesState.values()) {
      const {css} = fileState
      if (css) {
        written += await css.toFile(h)
      }
    }
    await h.close()
    log(p.info, `Written ${written} bytes to ${fileName}`, started)
  })()
}

function updateFilesState(
  info: server.PluginCreateInfo,
  filesState: Map<Path, FileState>,
  classNamesToFileSpans: Map<string, FileSpan[]>,
): boolean {
  const started = performance.now()

  const used = new Set<Path>()
  let added = 0
  let updated = 0
  let isRewriteCss = filesState.size === 0

  for (const name of info.project.getFileNames()) {
    const scriptInfo = info.project.projectService.getScriptInfo(name)
    if (!scriptInfo) continue

    const {fileName, path} = scriptInfo
    used.add(path)

    const prevState = filesState.get(path)
    const version = scriptInfo.getLatestVersion()
    if (prevState?.version === version) continue

    for (const className of prevState?.classNames ?? []) {
      if (classNamesToFileSpans.has(className)) {
        const updatedSpans = classNamesToFileSpans.get(className)!.filter(sp => sp.path !== path)
        if (updatedSpans.length)
          classNamesToFileSpans.set(className, updatedSpans)
        else
          classNamesToFileSpans.delete(className)
      }
    }

    const fileOutput = processFile(info, info.project.getSourceFile(path))
    filesState.set(path, {
      version,
      css: fileOutput?.css,
      classNames: [...new Set(fileOutput?.classNameAndSpans.map(({name: className}) => className))],
      diagnostics: fileOutput?.diagnostics ?? [],
    })

    for (const {name: className, span} of fileOutput?.classNameAndSpans ?? []) {
      if (classNamesToFileSpans.has(className))
        classNamesToFileSpans.get(className)!.push({fileName, path, span})
      else
        classNamesToFileSpans.set(className, [{fileName, path, span}])
    }

    added += prevState ? 0 : 1
    updated += prevState ? 1 : 0
    isRewriteCss ||= !areWritersEqual(fileOutput?.css, prevState?.css)
  }

  let removed = 0
  for (const path of filesState.keys()) {
    if (!used.has(path)) {
      const prevCss = filesState.get(path)?.css
      filesState.delete(path)

      removed++
      isRewriteCss ||= prevCss != null
    }
  }

  log(info, `added: ${added}, updated: ${updated}, removed: ${removed} :: Currently tracking ${filesState.size} files`, started)
  return isRewriteCss
}

const plainPropertyFlags = ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral | ts.TypeFlags.Null | ts.TypeFlags.BooleanLiteral

type FileOutput = {
  css: BufferWriter | undefined
  classNameAndSpans: NameAndSpan[]
  diagnostics: Diagnostic[]
}

type NameAndSpan = {
  name: string
  span: Span
}

function processFile(
  info: server.PluginCreateInfo,
  sourceFile: SourceFile | undefined
): FileOutput | undefined {
  if (!sourceFile) return undefined

  const srcRelativePath = path.relative(path.dirname(info.project.getProjectName()), sourceFile.fileName)
  const wr = new BufferWriter(
    defaultBufSize,
    `/* src: ${srcRelativePath} */\n`,
    `/* end: ${srcRelativePath} */\n`,
  )
  const classNameAndSpans: NameAndSpan[] = []
  const diagnostics: Diagnostic[] = []

  function isPlainPropertyOrTuple(p: Type): boolean {
    return !!(p.flags & plainPropertyFlags) || !!checker(info)?.isTupleType(p)
  }

  function writeStatement(statement: Statement, varOrCall: SatisfiesCss | ConstClassName) {
    classNameAndSpans.push(...varOrCall.classNameAndSpans)

    const used$References = new Set<number>()
    function resolve$Reference(input: string, property: Symbol): string {
      const {valueDeclaration} = property
      const targetNode = valueDeclaration && ts.isPropertySignature(valueDeclaration)
        ? valueDeclaration.name
        : valueDeclaration ?? statement

      const protectedRanges = findClassNameProtectedRanges(input)
      return input.replace(
        /\$(\d+)/,
        (whole, refIndex, offset) => {
          if (protectedRanges.some(([start, end]) => start <= offset && offset < end)) {
            return whole
          }

          const refIndexNum = Number(refIndex)
          used$References.add(refIndexNum)

          const className = varOrCall.classNameAndSpans[refIndexNum]?.name // TODO report error
          if (className == null) {
            debugger
            diagnostics.push({
              ...diagHeader,
              messageText: `The '${whole}' reference is out the of classnames array of length ${varOrCall.classNameAndSpans.length}`,
              file: statement.getSourceFile(),
              start: targetNode.getStart(),
              length: targetNode.getWidth(),
            })
          }

          return className ?? 'undefined'
        }
      )
    }

    type PreprocessedObject = {
      [propertyName: string]: string | (string | null)[] | PreprocessedObject | null
    }

    function convertPlainProperty(p: Type, property: Symbol): string | null {
      if (p.flags & ts.TypeFlags.StringLiteral) {
        const valueStr = (p as StringLiteralType).value
        return resolve$Reference(valueStr, property)
      }
      if (p.flags & ts.TypeFlags.NumberLiteral) {
        const value = (p as NumberLiteralType).value
        return value === 0 ? '0' : `${value}px`
      }
      if (p.flags & ts.TypeFlags.Null) {
        return null
      }
      if (p.flags & ts.TypeFlags.BooleanLiteral) {
        return checker(info)!.getTrueType() === p ? 'true' : 'false'
      }
      throw new Error(`${srcRelativePath}: flags=${p.flags} is not plain`)
    }

    /**
     * * Moves all root-scoped props to inside actual `.root-0 {...}`
     * * In conditional at-rules (`@media` etc) moves all non-obj props to inside additional `& {...}`
     * * Rewrites names
     * * Convert camelCase to kebab-case in plain props
     */
    function preprocessObject(name: string | /* root */ undefined, type: ObjectType): PreprocessedObject {
      const target: PreprocessedObject = {}
      let rootClassPropName: string | undefined = undefined

      function getPropertyTargetObject(propName: string, propType: Type, property: Symbol): PreprocessedObject {
        // Cleanup 3 params, leave only property
        const isConditionalAtRule = (p: string) => ['@media', '@supports', '@container', '@layer', '@scope'].some(r => p.startsWith(r))

        if (name == null && (
            // { color: red; } => { .root-0 { color: red; } }
            !propName.startsWith('@') && isPlainPropertyOrTuple(propType)
            // { &:hover {} } => { .root-0 { &:hover {} } }
            || propName.includes('&')
            || isConditionalAtRule(propName) && checker(info)?.getPropertiesOfType(propType).some(
              // { @media { & {} } } => { .root-0 { @media { & {} } }
              p => p.getName().includes('&')
                // { @media { color: red } } => { .root-0 { @media { color: red } } }
                || !(checker(info)!.getTypeOfSymbolAtLocation(p, statement).flags & ts.TypeFlags.Object)
            )
        )) {
          rootClassPropName ??= `.${resolve$Reference('$0', property)}`
          const existingRootClassBody = target[rootClassPropName]
          if (existingRootClassBody === null || typeof existingRootClassBody === 'string' || Array.isArray(existingRootClassBody)) {
            // { .root-0: null }
            // { .root-0: red }
            // { .root-0: [red, blue] } -- all 3 don't make any sense -- TODO report error
            throw new Error(`${propName} in ${srcRelativePath}: .${rootClassPropName}: ${existingRootClassBody} not supported`)
          }
          return existingRootClassBody ?? (target[rootClassPropName] = {})
        }

        // @media() { color: red; } => @media() { & { color: red; } }
        if (name
            && isConditionalAtRule(name)
            && isPlainPropertyOrTuple(propType)
        ) {
          const existingAmpBody = target['&']
          if (existingAmpBody === null || typeof existingAmpBody === 'string' || Array.isArray(existingAmpBody)) {
            // { &: null }
            // { &: red }
            // { &: [red, blue] } -- all 3 don't make any sense -- TODO report error
            throw new Error(`${propName} in ${srcRelativePath}: &: ${existingAmpBody} not supported`)
          }
          return existingAmpBody ?? (target['&'] = {})
        }

        return target
      }

      function getPropertiesInOrder(): Symbol[] {
        const properties = type.getProperties()
        // TODO decl within statement
        const declInFile= (s: Symbol) => s.getDeclarations()?.find(d => d.getSourceFile() === statement.getSourceFile())
        return properties.sort((p, q) =>
          // TODO recheck with completion - another decl possible
          (declInFile(p)?.getFullStart() ?? 0) - (declInFile(q)?.getFullStart() ?? 0 )
        )
      }

      for (const property of getPropertiesInOrder()) {
        const propertyName = resolve$Reference(property.getName(), property)
        const propertyType = checker(info)!.getTypeOfSymbolAtLocation(property, statement)
        const propertyTarget = getPropertyTargetObject(propertyName, propertyType, property)

        if (checker(info)!.isTupleType(propertyType)) {
          propertyTarget[camelCaseToKebabCase(propertyName)] = checker(info)!.getTypeArguments(propertyType as TupleType)
            .map(t => {
              if (t.flags & plainPropertyFlags) {
                return convertPlainProperty(t, property)
              } else {
                // TODO not supported -- report
                return undefined
              }
            })
            .filter(v => v !== undefined)
        } else if (propertyType.flags & ts.TypeFlags.Object) {
          const existingObject = propertyTarget[propertyName]
          const newObject = preprocessObject(propertyName, propertyType as ObjectType)
          if (propertyName === '&' && existingObject && typeof existingObject === 'object') {
            // { color: red, & { margin: 1 } => & { color: red }, & { margin: 1 } => & { color: red, margin: 1 }
            propertyTarget[propertyName] = {
              ...existingObject,
              ...newObject
            }
          } else {
            propertyTarget[propertyName] = newObject
          }
        } else if (propertyType.flags & plainPropertyFlags) {
          propertyTarget[camelCaseToKebabCase(propertyName)] = convertPlainProperty(propertyType, property)
        } else {
          // Not supported -- TODO report error
        }
      }

      return target
    }

    type QueuedObject = {
      ruleHeader: string | /* root */ undefined,
      object: PreprocessedObject,
      nestingLevel: number,
      parentSelector: string | /* root and global */ undefined,
    }

    function writeObjectAndNested(object: QueuedObject) {
      const queue: QueuedObject[] = [object]
      for (;;) {
        const poppedObj = queue.shift()
        if (!poppedObj) break

        const delayedObjects = writeObject(poppedObj)
        queue.unshift(...delayedObjects)
      }
    }

    function* writeObject({ruleHeader, object, nestingLevel, parentSelector}: QueuedObject): IterableIterator<QueuedObject> {
      const ruleHeaderImpl = ruleHeader && ruleHeader.replace(/&/g, parentSelector ?? '&' /* TODO report */)
      const isInsideAtRule = ruleHeader && ruleHeader.startsWith('@')

      const indent = (delta: number = 0) => '  '.repeat(nestingLevel + delta)

      if (ruleHeaderImpl) wr.write(indent(), ruleHeaderImpl, ' {\n')

      for (const [propertyName, propertyValue] of Object.entries(object)) {
        function writePlainProp(value: string | null) {
          wr.write(
            indent(ruleHeaderImpl ? 1 : 0),
            propertyName, 
            ...(value !== null) ? [': ', value] : [],
            ';\n'
          )
        }
        if (propertyValue === null || typeof propertyValue === 'string') {
          writePlainProp(propertyValue)
        } else if (Array.isArray(propertyValue)) {
          propertyValue.forEach(writePlainProp)
        } else if (isInsideAtRule) {
          writeObjectAndNested({
            ruleHeader: propertyName,
            object: propertyValue,
            nestingLevel: nestingLevel + 1,
            parentSelector,
          })
        } else {
          yield {
            ruleHeader: propertyName,
            object: propertyValue,
            nestingLevel,
            parentSelector: ruleHeaderImpl,
          }
        }
      }

      if (ruleHeaderImpl) wr.write(indent(), '}\n')
    }

    const object = preprocessObject(undefined, varOrCall.cssObject)

    writeObjectAndNested({ruleHeader: undefined, object, nestingLevel: 0, parentSelector: undefined})

    varOrCall.classNameAndSpans.forEach((nameAndSpan, index) => {
      if (!used$References.has(index)) {
        diagnostics.push({
          ...diagHeader,
          file: statement.getSourceFile(),
          messageText: 'Unused classname',
          ...getStartAndLength(statement.getSourceFile(), nameAndSpan.span),
        })
      }
    })
  }

  for (const statement of sourceFile.statements) {
    const cssVarOrCall = getCssExpression(info, statement, diagnostics)
      if (cssVarOrCall) {
      writeStatement(statement, cssVarOrCall)
    }
  }

  return {css: wr.finallize(), classNameAndSpans, diagnostics}
}


type ConstClassName = {
  bindingNamesAndSpans: (NameAndSpan | null)[]
} & SatisfiesCss

type SatisfiesCss = {
  classNameAndSpans: NameAndSpan[]
  cssObject: ObjectType
}

function getCssExpression(info: server.PluginCreateInfo, statement: Statement, diagnostics: Diagnostic[]): SatisfiesCss | ConstClassName | void {
  if (ts.isVariableStatement(statement)) {
    if (statement.declarationList.declarations.length !== 1) return

    const {initializer} = statement.declarationList.declarations[0]
    if (!initializer || !ts.isSatisfiesExpression(initializer)) return

    const bindingNamesAndSpans = getBindingNamesAndSpans(statement)
    if (!bindingNamesAndSpans) return

    const satisfiesCss = getSatisfiesCss(info, initializer, diagnostics)
    if (!satisfiesCss) return

    return {
      bindingNamesAndSpans,
      ...satisfiesCss
    }
  } else if (ts.isSatisfiesExpression(statement)) {
    return getSatisfiesCss(info, statement, diagnostics)
  }
}

function getBindingNamesAndSpans(statement: VariableStatement): (NameAndSpan | null)[] | void {
  if (statement.declarationList.declarations.length !== 1) return

  const {name: bindingName} = statement.declarationList.declarations[0]
  if (ts.isArrayBindingPattern(bindingName)) {
    return bindingName.elements
      .map(el => {
        if (!ts.isBindingElement(el)) return null
        const elBindingName = el.name
        if (!ts.isIdentifier(elBindingName)) return null
        return {
          name: elBindingName.text,
          span: getSpan(el)
        }
      })
  }

  if (ts.isIdentifier(bindingName))
    return [{name: bindingName.text, span: getSpan(bindingName)}]
}

function getSatisfiesCss(info: server.PluginCreateInfo, satisfiesExpr: SatisfiesExpression, diagnostics: Diagnostic[]): SatisfiesCss | void {
  const {expression: satisfiesLhs, type: satisfiesRhs} = satisfiesExpr

  const classNameAndSpans = getClassNameAndSpans(info, satisfiesLhs, diagnostics)
  if (!classNameAndSpans) return

  if (!ts.isTypeReferenceNode(satisfiesRhs)
    || !isTypiqueCssTypeReference(info, satisfiesRhs)
    || satisfiesRhs.typeArguments?.length !== 1
  ) return

  const cssObjectNode = satisfiesRhs.typeArguments[0]
  if (!cssObjectNode || !ts.isTypeLiteralNode(cssObjectNode)) return

  const cssObject = checker(info)?.getTypeAtLocation(cssObjectNode)
  if (!((cssObject?.flags ?? 0) & ts.TypeFlags.Object)) return

  return {
    cssObject: cssObject as ObjectType,
    classNameAndSpans,
  }
}

function getClassNameAndSpans(info: server.PluginCreateInfo, classNamesNode: Node, diagnostics: Diagnostic[]): NameAndSpan[] | void {
  if (ts.isStringLiteral(classNamesNode) || ts.isTemplateLiteral(classNamesNode))
    return [getStringLiteralNameAndSpan(info, classNamesNode)!]
  if (ts.isArrayLiteralExpression(classNamesNode)) {
    const classNames = classNamesNode.elements
      .map(el => getStringLiteralNameAndSpan(info, el))
    if (classNames.every<NameAndSpan>(it => !!it))
      return classNames
  }

  diagnostics.push({
    ...diagHeader,
    file: classNamesNode.getSourceFile(),
    start: classNamesNode.getStart(),
    length: classNamesNode.getWidth(),
    messageText: 'Expected: string literal or template string, or array literal of them, or helper function call',
  })
}

function getStringLiteralNameAndSpan(info: server.PluginCreateInfo, stringLiteralNode: Node): NameAndSpan | void {
  const type = checker(info)?.getTypeAtLocation(stringLiteralNode)
  if ((type?.flags ?? 0) & ts.TypeFlags.StringLiteral)
    return {
      name: (type as StringLiteralType).value,
      span: getSpan(stringLiteralNode)
    }
}

function getSpan(node: Node): Span {
  return {
    start: ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart()),
    end: ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getEnd())
  }
}

function getStartAndLength(sourceFile: SourceFile, span: Span): {start: number, length: number} {
  const start = ts.getPositionOfLineAndCharacter(sourceFile, span.start.line, span.start.character)
  const end = ts.getPositionOfLineAndCharacter(sourceFile, span.end.line, span.end.character)
  return {start, length: end - start}
}

function isTypiqueCssTypeReference(
  info: server.PluginCreateInfo,
  typeReference: TypeReferenceNode,
) {
  const type = checker(info)?.getTypeAtLocation(typeReference.typeName)
  if (!((type?.flags ?? 0) & ts.TypeFlags.Union)) return false
  
  const types = ((type?.flags ?? 0) & ts.TypeFlags.Union) && (type as UnionType).types
  if (!types || types.length !== 3) return false
  
  const brandedType = types[2]
  return brandedType.flags & ts.TypeFlags.Object && brandedType.getProperty('__typiqueCssBrand') != null
}


export function getDiagnostics(state: TypiquePluginState, fileName: string): Diagnostic[] {
  const scriptInfo = state.info.project.projectService.getScriptInfo(fileName)
  if (!scriptInfo) return []
  const sourceFile = state.info.languageService.getProgram()?.getSourceFileByPath(scriptInfo.path)
  if (!sourceFile) return []
  const classNames = state.filesState.get(scriptInfo.path)?.classNames ?? []

  const classNamesDiagnostics = classNames.flatMap(className => {
    const fileSpans = state.classNamesToFileSpans.get(className)!
    if (fileSpans.length === 1) return []

    return fileSpans
      .filter(fileSpan => fileSpan.path === scriptInfo.path)
      .map(fileSpan => {
        const relatedInformation = fileSpans
          .filter(otherSpan => fileSpan !== otherSpan)
          .map(otherSpan => {
            const otherScriptInfo = state.info.project.projectService.getScriptInfo(otherSpan.fileName)
            if (!otherScriptInfo) return undefined
            const otherSourceFile = state.info.languageService.getProgram()?.getSourceFileByPath(otherScriptInfo.path)
            if (!otherSourceFile) return undefined
            const relatedInfo: DiagnosticRelatedInformation = {
              ...diagHeader,
              file: otherSourceFile,
              messageText: `'${className}' is also here`,
              ...getStartAndLength(otherSourceFile, otherSpan.span),
            }
            return relatedInfo
          })
          .filter<DiagnosticRelatedInformation>(i => !!i)

        return {
          ...diagHeader,
          file: sourceFile,
          messageText: `The class name '${className}' is not unique`,
          ...getStartAndLength(sourceFile, fileSpan.span),
          relatedInformation,
        } satisfies Diagnostic
      })
  })
  const otherDiagnostics = state.filesState.get(scriptInfo.path)?.diagnostics ?? []
  return [...classNamesDiagnostics, ...otherDiagnostics]
}

export function getClassNamesCompletions(state: TypiquePluginState, fileName: string, position: number): string[] {
  const started = performance.now()
  const sourceFile = state.info.languageService.getProgram()?.getSourceFile(fileName)
  if (!sourceFile) return []

  const stringLiteral = findStringLiteralLikeAtPosition(sourceFile, position)
  if (!stringLiteral) return []

  const configClassNames = state.info.config.classNames ?? {}

  function varNameVariants(name: string) {
    return getVarNameVariants(
      name,
      String(configClassNames.varNameRegex ?? 'Class([Nn]ame)?$'),
    )
  }

  const renderCommonParams = {
    pattern: parseClassNamePattern(String(configClassNames.pattern ?? '${varName}')),
    isUsed: cn => state.classNamesToFileSpans.has(cn),
    maxCounter: Number(configClassNames.maxCounter ?? 999),
    maxRandomRetries: Number(configClassNames.maxRandomRetries ?? 10),
    randomGen: () => Math.random(),
  } satisfies RenderCommonParams

  function logItems(items: string[]) {
    log(state.info, `Got ${items.length} completion items`, started)
    return items
  }

  function parentIfParentIsSatisfiesExpression(node: Node): Node | undefined {
    const parent = node.parent
    return  (ts.isSatisfiesExpression(parent)) ? parent : node
  }

  const arrayLiteral = stringLiteral?.parent
  if (arrayLiteral && ts.isArrayLiteralExpression(arrayLiteral)) {
    const stringLiteralInArrayIndex = arrayLiteral.elements.indexOf(stringLiteral)
    if (stringLiteralInArrayIndex === -1) throw new Error('Could not find string literal in array literal')

    const varStmt = parentIfParentIsSatisfiesExpression(arrayLiteral)?.parent?.parent?.parent
    if (!varStmt || !ts.isVariableStatement(varStmt)) return []

    const bindingNamesAndSpans = getBindingNamesAndSpans(varStmt)
    if (!bindingNamesAndSpans) return []

    const bindingName = bindingNamesAndSpans[stringLiteralInArrayIndex]?.name
    if (bindingName == null) return []

    if (stringLiteralInArrayIndex === 0
      && arrayLiteral.elements.length === 1
      && bindingNamesAndSpans.length > 1
    ) {
      const varsNames = bindingNamesAndSpans
        .map((nameAndSpan) => nameAndSpan?.name ? varNameVariants(nameAndSpan.name)[0] : 'cn')
      const multipleVarsClassNames = renderClassNamesForMultipleVars(varsNames, renderCommonParams)
      const quote = sourceFile.text[stringLiteral.getStart(sourceFile)]
      const multipleVarsItem = multipleVarsClassNames.join(`${quote}, ${quote}`)

      const stdClassNames = renderClassNamesForOneVar(varNameVariants(bindingName), renderCommonParams)

      return logItems([multipleVarsItem, ...stdClassNames])
    }

    return logItems(renderClassNamesForOneVar(varNameVariants(bindingName), renderCommonParams))
  }

  const varStmt = parentIfParentIsSatisfiesExpression(stringLiteral)?.parent?.parent?.parent
  if (varStmt && ts.isVariableStatement(varStmt)) {
    const bindingNamesAndSpans = getBindingNamesAndSpans(varStmt)
    if (bindingNamesAndSpans?.length !== 1) return []

    const name = bindingNamesAndSpans[0]?.name
    if (!name) return []

    return logItems(renderClassNamesForOneVar( varNameVariants(name), renderCommonParams))
  }

  return []
}

/**
 * findTokenAtPosition is not exposed
 */
function findStringLiteralLikeAtPosition(sourceFile: ts.SourceFile, position: number): StringLiteralLike | undefined {
  function visit(node: ts.Node): StringLiteralLike | undefined {
    if (node.getStart() <= position && position < node.getEnd()) {
      return ts.isStringLiteralLike(node) ? node : ts.forEachChild(node, visit)
    }
    return undefined
  }

  return visit(sourceFile)
}
