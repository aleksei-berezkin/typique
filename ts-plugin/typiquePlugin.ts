import ts from 'typescript/lib/tsserverlibrary'
import type { ObjectType, StringLiteralType, Path, server, SatisfiesExpression, SourceFile, Symbol, NumberLiteralType, Type, TupleType, Diagnostic, TypeReferenceNode, Node, UnionType, DiagnosticRelatedInformation, StringLiteralLike, VariableStatement, CodeFixAction } from 'typescript/lib/tsserverlibrary'
import fs from 'node:fs'
import path from 'node:path'
import { areWritersEqual, BufferWriter, defaultBufSize } from './BufferWriter'
import { camelCaseToKebabCase, findClassNameProtectedRanges, getVarNameVariants } from './util'
import { parseClassNamePattern, renderClassNamesForMultipleVars, renderClassNamesForOneVar, RenderCommonParams } from './classNamePattern'
import { areSpansIntersecting, getNodeSpan, getSpan, toTextSpan, type Span } from './span'
import { actionDescriptionAndName, errorCodeAndMsg } from './messages'
import { findStringLiteralLikeAtPosition } from './findNode'


export type TypiquePluginState = {
  info: server.PluginCreateInfo
  filesState: Map<Path, FileState>
  classNamesToFileSpans: Map<string, FileSpan[]>
  writing: Promise<void>
}

export type FileState = {
  version: string
  css: BufferWriter | undefined
  classNames: Set<string> | undefined
  diagnostics: Diagnostic[]
}

export type FileSpan = {
  fileName: string
  path: Path // lowercased by TS on OS X and Windows
  span: Span
}

const diagHeader = {
  category: ts.DiagnosticCategory.Error,
  source: 'typique',
}

function checker(info: server.PluginCreateInfo) {
  return info.languageService.getProgram()?.getTypeChecker()
}

function scriptInfoAndSourceFile(state: TypiquePluginState, fileName: string): {scriptInfo: server.ScriptInfo | undefined, sourceFile: SourceFile | undefined} {
  const scriptInfo = state.info.project.projectService.getScriptInfo(fileName)
  if (!scriptInfo) return {scriptInfo: undefined, sourceFile: undefined}
  const sourceFile = state.info.languageService.getProgram()?.getSourceFileByPath(scriptInfo.path)
  return {scriptInfo, sourceFile}
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
  const {isRewriteCss} = updateFilesState(
    p.info,
    p.filesState,
    p.classNamesToFileSpans,
    filePath => processFile(p.info, filePath),
  );

  const fileName = path.join(path.dirname(p.info.project.getProjectName()), 'typique-output.css')
  if (!isRewriteCss) {
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

export function updateFilesState(
  info: server.PluginCreateInfo,
  filesState: Map<Path, FileState>,
  classNamesToFileSpans: Map<string, FileSpan[]>,
  processFile: (path: Path) => FileOutput | undefined,
): {
  added: number
  updated: number
  removed: number
  isRewriteCss: boolean
} {
  const started = performance.now()

  function addFileSpan(className: string, fileSpan: FileSpan) {
    if (classNamesToFileSpans.has(className))
      classNamesToFileSpans.get(className)!.push(fileSpan)
    else
      classNamesToFileSpans.set(className, [fileSpan])

  }

  function removeFileSpans(className: string, path: Path) {
    if (classNamesToFileSpans.has(className)) {
      const updatedSpans = classNamesToFileSpans.get(className)!.filter(sp => sp.path !== path)
      if (updatedSpans.length)
        classNamesToFileSpans.set(className, updatedSpans)
      else
        classNamesToFileSpans.delete(className)
    }
  }

  const used = new Set<Path>()
  let added = 0
  let updated = 0
  let isRewriteCss = filesState.size === 0

  for (const scriptInfo of info.project.getFileNames()
    .map(f => info.project.projectService.getScriptInfo(f))
    .filter(i => !!i)
  ) {
    const {fileName, path} = scriptInfo
    used.add(path)

    const prevState = filesState.get(path)
    const version = scriptInfo.getLatestVersion()
    if (prevState?.version === version) continue

    prevState?.classNames?.forEach(className =>
      removeFileSpans(className, path)
    )

    const fileOutput = processFile(path)

    filesState.set(path, {
      version,
      css: fileOutput?.css,
      classNames: new Set(fileOutput?.classNameAndSpans.map(({name}) => name)),
      diagnostics: fileOutput?.diagnostics ?? [],
    })

    fileOutput?.classNameAndSpans?.forEach(({name: className, span}) =>
      addFileSpan(className, {fileName, path, span})
    )

    added += prevState ? 0 : 1
    updated += prevState ? 1 : 0
    isRewriteCss ||= !areWritersEqual(fileOutput?.css, prevState?.css)
  }

  let removed = 0
  for (const path of filesState.keys()) {
    if (!used.has(path)) {
      const prevState = filesState.get(path)
      filesState.delete(path)
      prevState?.classNames?.forEach(className => removeFileSpans(className, path))

      removed++
      isRewriteCss ||= prevState != null
    }
  }

  log(info, `added: ${added}, updated: ${updated}, removed: ${removed} :: Currently tracking ${filesState.size} files`, started)

  return {
    added,
    updated,
    removed,
    isRewriteCss,
  }
}

const plainPropertyFlags = ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral | ts.TypeFlags.Null | ts.TypeFlags.BooleanLiteral

export type FileOutput = {
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
  filePath: Path,
): FileOutput | undefined {
  const sourceFile = info.project.getSourceFile(filePath)
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

  function writeSatisfiesCss(satisfiesExpr: SatisfiesExpression, satisfiesCss: SatisfiesCss) {
    classNameAndSpans.push(...satisfiesCss.classNameAndSpans)

    const used$References = new Set<number>()
    function resolve$Reference(input: string, property: Symbol): string {
      const {valueDeclaration} = property
      const targetNode = valueDeclaration && ts.isPropertySignature(valueDeclaration)
        ? valueDeclaration.name
        : valueDeclaration ?? satisfiesExpr

      const protectedRanges = findClassNameProtectedRanges(input)
      return input.replace(
        /\$(\d+)/,
        (whole, refIndex, offset) => {
          if (protectedRanges.some(([start, end]) => start <= offset && offset < end)) {
            return whole
          }

          const refIndexNum = Number(refIndex)
          used$References.add(refIndexNum)

          const className = satisfiesCss.classNameAndSpans[refIndexNum]?.name
          if (className == null) {
            const classNames = satisfiesCss.classNameAndSpans.map(({name}) => name)
            const tupleType = classNames.length ? `["${classNames.join('", "')}"]` : '[]'
            diagnostics.push({
              ...diagHeader,
              ...errorCodeAndMsg.tupleHasNoElement(tupleType, classNames.length, refIndexNum),
              file: satisfiesExpr.getSourceFile(),
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
                || !(checker(info)!.getTypeOfSymbolAtLocation(p, satisfiesExpr).flags & ts.TypeFlags.Object)
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
        const declInFile= (s: Symbol) => s.getDeclarations()?.find(d => d.getSourceFile() === satisfiesExpr.getSourceFile())
        return properties.sort((p, q) =>
          // TODO recheck with completion - another decl possible
          (declInFile(p)?.getFullStart() ?? 0) - (declInFile(q)?.getFullStart() ?? 0 )
        )
      }

      for (const property of getPropertiesInOrder()) {
        const propertyName = resolve$Reference(property.getName(), property)
        const propertyType = checker(info)!.getTypeOfSymbolAtLocation(property, satisfiesExpr)
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

    const object = preprocessObject(undefined, satisfiesCss.cssObject)

    writeObjectAndNested({ruleHeader: undefined, object, nestingLevel: 0, parentSelector: undefined})

    satisfiesCss.classNameAndSpans.forEach((nameAndSpan, index) => {
      if (!used$References.has(index)) {
        diagnostics.push({
          ...diagHeader,
          ...errorCodeAndMsg.unused,
          file: satisfiesExpr.getSourceFile(),
          ...toTextSpan(satisfiesExpr.getSourceFile(), nameAndSpan.span),
        })
      }
    })
  }

  function visit(node: Node) {
    if (ts.isSatisfiesExpression(node)) {
      const satisfiesCss = getSatisfiesCss(info, node, diagnostics)
      if (satisfiesCss) {
        writeSatisfiesCss(node, satisfiesCss)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return {css: wr.finallize(), classNameAndSpans, diagnostics}
}

type SatisfiesCss = {
  classNameAndSpans: NameAndSpan[]
  cssObject: ObjectType
}

function getSatisfiesCss(info: server.PluginCreateInfo, satisfiesExpr: SatisfiesExpression, diagnostics: Diagnostic[]): SatisfiesCss | void {
  const {expression: satisfiesLhs, type: satisfiesRhs} = satisfiesExpr

  if (!ts.isTypeReferenceNode(satisfiesRhs)
    || !isTypiqueCssTypeReference(info, satisfiesRhs)
    || satisfiesRhs.typeArguments?.length !== 1
  ) return

  const cssObjectNode = satisfiesRhs.typeArguments[0]
  if (!cssObjectNode || !ts.isTypeLiteralNode(cssObjectNode)) return

  const classNameAndSpans = getClassNameAndSpans(info, satisfiesLhs, diagnostics)
  if (!classNameAndSpans) return

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
    ...errorCodeAndMsg.satisfiesLhsUnexpected,
    file: classNamesNode.getSourceFile(),
    start: classNamesNode.getStart(),
    length: classNamesNode.getWidth(),
  })
}

function getStringLiteralNameAndSpan(info: server.PluginCreateInfo, stringLiteralNode: Node): NameAndSpan | void {
  const type = checker(info)?.getTypeAtLocation(stringLiteralNode)
  if ((type?.flags ?? 0) & ts.TypeFlags.StringLiteral)
    return {
      name: (type as StringLiteralType).value,
      span: getNodeSpan(stringLiteralNode)
    }
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
  const {scriptInfo, sourceFile} = scriptInfoAndSourceFile(state, fileName)
  if (!scriptInfo || !sourceFile) return []

  const classNamesDiagnostics = getClassNamesInFile(state, scriptInfo)
    .filter(({otherSpans}) => otherSpans.length)
    .map(({className, span, otherSpans}) => ({
      ...diagHeader,
      ...errorCodeAndMsg.duplicate(className),
      file: sourceFile,
      ...toTextSpan(sourceFile, span),
      relatedInformation: otherSpans
        .map<DiagnosticRelatedInformation | undefined>(({fileName, span}) => {
          const {sourceFile} = scriptInfoAndSourceFile(state, fileName)
          if (!sourceFile) return undefined

          return {
            ...diagHeader,
            ...errorCodeAndMsg.alsoDeclared(className),
            file: sourceFile,
            ...toTextSpan(sourceFile, span),
          }
        })
        .filter<DiagnosticRelatedInformation>(i => !!i),
    }))

  const otherDiagnostics = state.filesState.get(scriptInfo.path)?.diagnostics ?? []
  return [...classNamesDiagnostics, ...otherDiagnostics]
}

export function getCodeFixes(state: TypiquePluginState, fileName: string, start: number, end: number): CodeFixAction[] {
  const started = performance.now()
  const fixes = getCodeFixesImpl(state, fileName, start, end)
  log(state.info, `Got ${fixes.length} code fixes`, started)
  return fixes
}

function getCodeFixesImpl(state: TypiquePluginState, fileName: string, start: number, end: number): CodeFixAction[] {
  const {scriptInfo, sourceFile} = scriptInfoAndSourceFile(state, fileName)
  if (!scriptInfo || !sourceFile) return []

  const requestSpan = getSpan(sourceFile, start, end)

  return getClassNamesInFile(state, scriptInfo)
    .filter(({span}) => areSpansIntersecting(span, requestSpan))
    .flatMap(({className, span, otherSpans}) => {
      const codeActions: CodeFixAction[] = []
      if (otherSpans.length) {
        const stringLiteral = findStringLiteralLikeAtPosition(sourceFile, ts.getPositionOfLineAndCharacter(sourceFile, span.start.line, span.start.character))
        if (stringLiteral) {
          codeActions.push(
            ...[...genClassNamesSuggestions(state, stringLiteral)]
              .map(newClassName => ({
                ...actionDescriptionAndName.change(className, newClassName),
                  changes: [{
                    fileName,
                    textChanges: [{
                      span: toTextSpan(sourceFile, getStringLiteralContentSpan(stringLiteral)),
                      newText: newClassName,
                    }],
                  }],
                }))
          )
        }
      }
      // TODO if not satisfies pattern
      return codeActions
    })
}

type ClassNameInFile = {
  className: string
  span: Span
  otherSpans: FileSpan[]
}

function getClassNamesInFile(state: TypiquePluginState, scriptInfo: server.ScriptInfo): ClassNameInFile[] {
  const classNamesInFile = state.filesState.get(scriptInfo.path)?.classNames
  if (!classNamesInFile) return [];

  return [...classNamesInFile].flatMap(className => {
    const fileSpans = state.classNamesToFileSpans.get(className)!
    return fileSpans
      .filter(fileSpan => fileSpan.path === scriptInfo.path)
      .map(fileSpan => ({
        className,
        span: fileSpan.span,
        otherSpans: fileSpans.filter(otherFileSpan => fileSpan !== otherFileSpan),
      }))
  })
}

export function getClassNamesCompletions(state: TypiquePluginState, fileName: string, position: number): string[] {
  const started = performance.now()
  function doGetCompletions() {
    const {sourceFile} = scriptInfoAndSourceFile(state, fileName)
    if (!sourceFile) return []
    const stringLiteral = findStringLiteralLikeAtPosition(sourceFile, position)
    if (!stringLiteral || stringLiteral.getStart() === position) return []
    return [...genClassNamesSuggestions(state, stringLiteral)]
  }

  const classNames = doGetCompletions()
  log(state.info, `Got ${classNames.length} completion items`, started)
  return classNames
}

function* genClassNamesSuggestions(state: TypiquePluginState, stringLiteral: StringLiteralLike): IterableIterator<string> {
  const sourceFile = stringLiteral?.getSourceFile()
  if (!sourceFile) return []

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

  const contextNames = getContextNames(state, stringLiteral)
  if (contextNames.length > 1) {
    const varsNames = contextNames
      .map((contextName) => varNameVariants(contextName)[0])
    const multipleVarsClassNames = renderClassNamesForMultipleVars(varsNames, renderCommonParams)
    const quote = sourceFile.text[stringLiteral.getStart(sourceFile)]
    yield multipleVarsClassNames.join(`${quote}, ${quote}`)
  }

  if (contextNames.length) {
    yield* renderClassNamesForOneVar(varNameVariants(contextNames[0]), renderCommonParams)
  }
}

function getContextNames(state: TypiquePluginState, stringLiteral: StringLiteralLike): string[] {
  const sourceFile = stringLiteral?.getSourceFile()
  if (!sourceFile) return []

  // TODO find name for any context

  const varStmt = ts.findAncestor(stringLiteral, node => ts.isVariableStatement(node))
  if (!varStmt) return []

  const bindingNames = getBindingNames(varStmt)
  if (!bindingNames) return []

  const defaultName = 'cn' // TODO settings

  if (bindingNames.length > 1) {
    const arrayLiteral = stringLiteral?.parent
    if (arrayLiteral && ts.isArrayLiteralExpression(arrayLiteral)) {
      const literalIndex = arrayLiteral.elements.indexOf(stringLiteral)

      return literalIndex === 0 && arrayLiteral.elements.length === 1
        ? bindingNames.map(name => name ?? defaultName)
        : [bindingNames[literalIndex] ?? defaultName]
    }
  }

  return [bindingNames[0] ?? defaultName]
}

function getBindingNames(statement: VariableStatement): (string | null)[] | undefined {
  if (statement.declarationList.declarations.length !== 1) return

  const {name: bindingName} = statement.declarationList.declarations[0]
  if (ts.isArrayBindingPattern(bindingName)) {
    return bindingName.elements
      .map(el => {
        if (!ts.isBindingElement(el)) return null
        const elBindingName = el.name
        if (!ts.isIdentifier(elBindingName)) return null
        return elBindingName.text
      })
  }

  if (ts.isIdentifier(bindingName))
    return [bindingName.text]
}

function getStringLiteralContentSpan(stringLiteral: StringLiteralLike): Span {
  const span = getNodeSpan(stringLiteral)
  // TODO: handle start and end of line
  span.start.character += 1
  span.end.character -= 1
  return span
}
