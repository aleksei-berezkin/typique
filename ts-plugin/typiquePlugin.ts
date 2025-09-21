import ts from 'typescript/lib/tsserverlibrary'
import type { ObjectType, StringLiteralType, Path, server, SatisfiesExpression, SourceFile, Symbol, NumberLiteralType, Type, TupleType, Diagnostic, TypeReferenceNode, Node, UnionType, DiagnosticRelatedInformation, StringLiteralLike, VariableStatement, CodeFixAction } from 'typescript/lib/tsserverlibrary'
import fs from 'node:fs'
import path from 'node:path'
import { areWritersEqual, BufferWriter, defaultBufSize } from './BufferWriter'
import { camelCaseToKebabCase, findClassNameProtectedRanges } from './util'
import { getNamePayloadIfMatches, getNameVariants } from './names'
import { classNameMatchesPattern, parseClassNamePattern, renderClassNamesForMultipleVars, renderClassNamesForOneVar, RenderCommonParams } from './classNamePattern'
import { areSpansIntersecting, getNodeSpan, getSpan, toTextSpan, type Span } from './span'
import { actionDescriptionAndName, errorCodeAndMsg } from './messages'
import { findStringLiteralLikeAtPosition } from './findNode'
import { classNameReferenceRegExp, getRootReference, getUnusedClassNames, resolveClassNameReference, unfold, type ClassNameAndSpans, type NameAndSpan } from './classNameAndSpans'


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

type Config = {
  classNames?: {
    pattern?: string
    maxCounter?: number
    maxRandomRetries?: number
    varNameRegex?: string
  }
  include?: string | string[]
  noEmit?: boolean
  outputSourceFileNames?: boolean
  output?: string
}

function config(state: TypiquePluginState): Config {
  return state.info.config
}

function classNamePattern(state: TypiquePluginState) {
  return parseClassNamePattern(classNamePatternStr(state))
}

function classNamePatternStr(state: TypiquePluginState) {
  return String(config(state)?.classNames?.pattern ?? '${contextName}')
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

  function writeCssExpression(satisfiesExpr: SatisfiesExpression, cssExpression: CssExpression) {
    classNameAndSpans.push(...unfold(cssExpression.classNameAndSpans))
    diagnostics.push(...cssExpression.diagnostics)

    const usedReferences = new Set<string>()
    function resolveClassNameReferences(input: string, property: Symbol): string {
      const protectedRanges = findClassNameProtectedRanges(input)
      return input.replace(
        classNameReferenceRegExp(),
        (reference, offset) => {
          if (protectedRanges.some(([start, end]) => start <= offset && offset < end))
            return reference

          const className = resolveClassNameReference(reference, cssExpression.classNameAndSpans)
          if (className == null) {
            const {valueDeclaration} = property
            const diagTargetNode = valueDeclaration && ts.isPropertySignature(valueDeclaration)
              ? valueDeclaration.name
              : valueDeclaration ?? satisfiesExpr
            diagnostics.push({
              ...diagHeader,
              ...errorCodeAndMsg.cannotFind(reference),
              file: satisfiesExpr.getSourceFile(),
              start: diagTargetNode.getStart(),
              length: diagTargetNode.getWidth(),
            })
          }

          usedReferences.add(reference)
          return className ?? 'undefined'
        }
      )
    }

    function resolveRootClassName(property: Symbol) {
      const root = getRootReference(cssExpression.classNameAndSpans)
      if (!root)
        // TODO This is made only for diagnostics, but the result message is inaccurate
        return resolveClassNameReferences('$0', property)

      const {name, ref} = root
      usedReferences.add(ref)
      return name
    }

    type PreprocessedObject = {
      [propertyName: string]: string | (string | null)[] | PreprocessedObject | null
    }

    function convertPlainProperty(p: Type, property: Symbol): string | null {
      if (p.flags & ts.TypeFlags.StringLiteral) {
        const valueStr = (p as StringLiteralType).value
        return resolveClassNameReferences(valueStr, property)
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
          rootClassPropName ??= `.${resolveRootClassName(property)}`
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
        const propertyName = resolveClassNameReferences(property.getName(), property)
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

    const object = preprocessObject(undefined, cssExpression.cssObject)

    writeObjectAndNested({ruleHeader: undefined, object, nestingLevel: 0, parentSelector: undefined})

    for (const unusedName of getUnusedClassNames(usedReferences, cssExpression.classNameAndSpans)) {
      diagnostics.push({
        ...diagHeader,
        ...errorCodeAndMsg.unused,
        file: satisfiesExpr.getSourceFile(),
        ...toTextSpan(satisfiesExpr.getSourceFile(), unusedName.span),
      })
    }
  }

  function visit(node: Node) {
    if (ts.isSatisfiesExpression(node)) {
      const cssExpression = getCssExpression(info, node)
      if (cssExpression) {
        writeCssExpression(node, cssExpression)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return {css: wr.finalize(), classNameAndSpans, diagnostics}
}

type CssExpression = {
  classNameAndSpans: ClassNameAndSpans
  diagnostics: Diagnostic[]
  cssObject: ObjectType
}

function getCssExpression(info: server.PluginCreateInfo, satisfiesExpr: SatisfiesExpression): CssExpression | undefined {
  const {expression: satisfiesLhs, type: satisfiesRhs} = satisfiesExpr

  if (!ts.isTypeReferenceNode(satisfiesRhs)
    || !isTypiqueCssTypeReference(info, satisfiesRhs)
    || satisfiesRhs.typeArguments?.length !== 1
  ) return

  const cssObjectNode = satisfiesRhs.typeArguments[0]
  if (!cssObjectNode || !ts.isTypeLiteralNode(cssObjectNode)) return

  const cssObject = checker(info)?.getTypeAtLocation(cssObjectNode)
  if (!((cssObject?.flags ?? 0) & ts.TypeFlags.Object)) return
  
  function getClassNameAndSpansWithDiag(node: Node): {
    classNameAndSpans: ClassNameAndSpans
    diagnostics: Diagnostic[]
  } {
    const createDiagnostic = (diagNode = node) => ({
      ...diagHeader,
      ...errorCodeAndMsg.satisfiesLhsUnexpected,
      file: diagNode.getSourceFile(),
      start: diagNode.getStart(),
      length: diagNode.getWidth(),
    })

    if (ts.isStringLiteral(node) || ts.isTemplateLiteral(node)) {
      const type = checker(info)?.getTypeAtLocation(node)
      return type && (type.flags & ts.TypeFlags.StringLiteral)
        ? {
          classNameAndSpans: {
            type: 'plain',
            nameAndSpan: {
              name: (type as StringLiteralType).value,
              span: getNodeSpan(node),
            },
          },
          diagnostics: [],
        }
        : {
          classNameAndSpans: {
            type: 'empty',
          },
          diagnostics: [createDiagnostic()],
        }
    }

    if (ts.isArrayLiteralExpression(node)) {
      const items = node.elements
        .map(el => getClassNameAndSpansWithDiag(el))
      return {
        classNameAndSpans: {
          type: 'array',
          nameAndSpans: items.map(({classNameAndSpans}) => classNameAndSpans),
        },
        diagnostics: items.flatMap(({diagnostics}) => diagnostics),
      }
    }

    if (ts.isObjectLiteralExpression(node)) {
      const items = node.properties
        .map(prop => {
          if (ts.isPropertyAssignment(prop)) {
            const {name, initializer} = prop
            return [name.getText(), getClassNameAndSpansWithDiag(initializer)] as const
          }
          return [undefined, {classNameAndSpans: {type: 'empty'}, diagnostics: [createDiagnostic(prop)]}] as const
        })
      return {
        classNameAndSpans: {
          type: 'object',
          nameAndSpans: Object.fromEntries(
            items
              .filter(([name]) => name != null)
              .map(([name, {classNameAndSpans}]) => [
                name,
                classNameAndSpans,
              ]),
          )
        },
        diagnostics: items.flatMap(([, {diagnostics}]) => diagnostics),
      }
    }

    return {
      classNameAndSpans: {
        type: 'empty',
      },
      diagnostics: [createDiagnostic()],
    }
  }

  const {classNameAndSpans, diagnostics} = getClassNameAndSpansWithDiag(satisfiesLhs)

  return {
    classNameAndSpans,
    diagnostics,
    cssObject: cssObject as ObjectType,
  }
}

function isDiagnostic<T extends object>(diagCandidate: Diagnostic | T): diagCandidate is Diagnostic {
  return 'code' in diagCandidate && 'messageText' in diagCandidate 
}


function isTypiqueCssTypeReference(
  info: server.PluginCreateInfo,
  typeReference: TypeReferenceNode,
) {
  const type = checker(info)?.getTypeAtLocation(typeReference.typeName)
  if (!((type?.flags ?? 0) & ts.TypeFlags.Union)) return false
  
  const types = ((type?.flags ?? 0) & ts.TypeFlags.Union) && (type as UnionType).types
  if (!types || types.length !== 4) return false
  
  const brandedType = types[3]
  return brandedType.flags & ts.TypeFlags.Object && brandedType.getProperty('__typiqueCssBrand') != null
}


export function getDiagnostics(state: TypiquePluginState, fileName: string): Diagnostic[] {
  const started = performance.now()

  function* genClassNamesDiagnostics(): IterableIterator<Diagnostic> {
    const {scriptInfo, sourceFile} = scriptInfoAndSourceFile(state, fileName)
    if (!scriptInfo || !sourceFile) return

    for (const {className, span, otherSpans} of getClassNamesInFile(state, scriptInfo)) {
      const common = {
        ...diagHeader,
        file: sourceFile,
        ...toTextSpan(sourceFile, span),
      }

      const stringLiteral = findStringLiteralLikeAtPosition(sourceFile, ts.getPositionOfLineAndCharacter(sourceFile, span.start.line, span.start.character))
      if (stringLiteral) {
        const contextNames = getContextNames(state, stringLiteral, false)
        if (contextNames.length && !classNameMatchesPattern(className, contextNames[0], classNamePattern(state))) {
          yield {
            ...common,
            ...errorCodeAndMsg.doesNotSatisfy(className, classNamePatternStr(state)),
          }
        }
      }

      if (otherSpans.length) {
        yield {
          ...common,
          ...errorCodeAndMsg.duplicate(className),
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
        }
      }
    }
  }

  function getOtherDiagnostics() {
    const {scriptInfo} = scriptInfoAndSourceFile(state, fileName)
    if (!scriptInfo) return []
    return state.filesState.get(scriptInfo.path)?.diagnostics ?? []
  }

  const diagnostics = [...genClassNamesDiagnostics(), ...getOtherDiagnostics()]
  log(state.info, `Got ${diagnostics.length} diagnostics`, started)
  return diagnostics
}

export function getCodeFixes(state: TypiquePluginState, fileName: string, start: number, end: number, errorCodes: readonly number[]): CodeFixAction[] {
  const started = performance.now()

  function* genCodeFixesImpl(): IterableIterator<CodeFixAction> {
    const {scriptInfo, sourceFile} = scriptInfoAndSourceFile(state, fileName)
    if (!scriptInfo || !sourceFile) return []

    const requestSpan = getSpan(sourceFile, start, end)

    for (const {className, span, otherSpans} of getClassNamesInFile(state, scriptInfo)) {
      if (!areSpansIntersecting(span, requestSpan)) continue

      const stringLiteral = findStringLiteralLikeAtPosition(sourceFile, ts.getPositionOfLineAndCharacter(sourceFile, span.start.line, span.start.character))
      if (!stringLiteral) continue

      const contextNames = getContextNames(state, stringLiteral, false)
      if (!contextNames.length) continue

      if (errorCodes.includes(errorCodeAndMsg.doesNotSatisfy('', '').code) && !classNameMatchesPattern(className, contextNames[0], classNamePattern(state))
        || otherSpans.length && errorCodes.includes(errorCodeAndMsg.duplicate('').code)
      ) {
        for (const newText of genClassNamesSuggestions(state, stringLiteral, contextNames)) {
          yield {
            ...actionDescriptionAndName.change(className, newText),
            changes: [{
              fileName,
              textChanges: [{
                span: toTextSpan(sourceFile, getStringLiteralContentSpan(stringLiteral)),
                newText,
              }],
            }],
          }
        }
      }
    }
  }

  const fixes = [...genCodeFixesImpl()]
  log(state.info, `Got ${fixes.length} code fixes`, started)
  return fixes
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

export function getCompletions(state: TypiquePluginState, fileName: string, position: number): string[] {
  const started = performance.now()
  function doGetCompletions() {
    const {sourceFile} = scriptInfoAndSourceFile(state, fileName)
    if (!sourceFile) return []
    const stringLiteral = findStringLiteralLikeAtPosition(sourceFile, position)
    if (!stringLiteral || stringLiteral.getStart() === position) return []
    const contextNames = getContextNames(state, stringLiteral, true)
    if (!contextNames.length) return []
    return [...genClassNamesSuggestions(state, stringLiteral, contextNames)] // TODO test when doesn't match
  }

  const classNames = doGetCompletions()
  log(state.info, `Got ${classNames.length} completion items`, started)
  return classNames
}

function* genClassNamesSuggestions(state: TypiquePluginState, stringLiteral: StringLiteralLike, contextNames: string[]): IterableIterator<string> {
  const sourceFile = stringLiteral?.getSourceFile()
  if (!sourceFile) return []

  const renderCommonParams = {
    pattern: classNamePattern(state),
    isUsed: cn => state.classNamesToFileSpans.has(cn),
    maxCounter: Number(config(state)?.classNames?.maxCounter ?? 999),
    maxRandomRetries: Number(config(state)?.classNames?.maxRandomRetries ?? 10),
    randomGen: () => Math.random(),
  } satisfies RenderCommonParams

  if (contextNames.length > 1) {
    const varsNames = contextNames
      .map((contextName) => getNameVariants(contextName)[0])
    const multipleVarsClassNames = renderClassNamesForMultipleVars(varsNames, renderCommonParams)
    const quote = sourceFile.text[stringLiteral.getStart(sourceFile)]
    yield multipleVarsClassNames.join(`${quote}, ${quote}`)
  }

  if (contextNames.length) {
    yield* renderClassNamesForOneVar(getNameVariants(contextNames[0]), renderCommonParams)
  }
}

// TODO fixes when length > 1
// TODO or introduce more explicit object with type: single, array, object etc
function getContextNames(state: TypiquePluginState, stringLiteral: StringLiteralLike, isMatchToPatternRequired: boolean): string[] {
  const sourceFile = stringLiteral?.getSourceFile()
  if (!sourceFile) return []

  // TODO find name for any context

  function getContextNamesViaBindingNames() {
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

  const contextNames = getContextNamesViaBindingNames()
  const pattern = config(state)?.classNames?.varNameRegex ?? 'Class(es)?([Nn]ames?)?$'
  const contextNamesPayloads = contextNames
    .map(n => getNamePayloadIfMatches(n, pattern))
  if (contextNamesPayloads.every(p => p != null)) {
    return contextNamesPayloads
  } else if (!isMatchToPatternRequired) {
    return contextNamesPayloads.map((p, i) => p ?? contextNames[i])
  } else {
    return []
  }
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
