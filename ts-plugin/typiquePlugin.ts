import ts from 'typescript/lib/tsserverlibrary'
import type { ObjectType, StringLiteralType, server, SatisfiesExpression, SourceFile, Symbol, NumberLiteralType, Type, TupleType, Diagnostic, TypeReferenceNode, Node, UnionType, DiagnosticRelatedInformation, StringLiteralLike, VariableStatement, CodeFixAction, CompletionEntry, SymbolDisplayPart, CodeAction } from 'typescript/lib/tsserverlibrary'
import fs from 'node:fs'
import path from 'node:path'
import { areWritersEqual, BufferWriter, defaultBufSize } from './BufferWriter'
import { camelCaseToKebabCase, findClassNameProtectedRanges, padZeros, replaceExtensionWithCss } from './util'
import { type ContextNamePart, getNamePayloadIfMatches, getContextNameVariants } from './names'
import { nameMatchesPattern, parseGeneratedNamePattern, generateNamesForMultipleVars, generateNamesForOneVar, GenerateCommonParams, GeneratedNamePattern } from './generateNames'
import { areSpansIntersecting, getNodeSpan, getSpan, toTextSpan, type Span } from './span'
import { actionDescriptionAndName, errorCodeAndMsg } from './messages'
import { findIdentifierAtPosition, findStringLiteralLikeAtPosition } from './findNode'
import { referenceRegExp, getRootReference, getUnreferencedNames, resolveNameReference, unfold, type NameAndSpansObject, type NameAndSpan } from './nameAndSpansObject'


export type TypiquePluginState = {
  info: server.PluginCreateInfo
  filesState: Map<server.NormalizedPath, FileState>
  classNamesToFileSpans: Map<string, FileSpan[]>
  varNamesToFileSpans: Map<string, FileSpan[]>
  writing: Promise<void>
  propertyToDoc: Map<string, SymbolDisplayPart[]> | undefined
}

export type FileState = {
  version: string
  css: BufferWriter | undefined
  classNames: Set<string> | undefined
  varNames: Set<string> | undefined
  diagnostics: Diagnostic[]
}

export type FileSpan = {
  fileName: server.NormalizedPath
  span: Span
}

const diagHeader = {
  category: ts.DiagnosticCategory.Error,
  source: 'typique',
}

type Config = {
  exclude?: string | string[]
  generatedNames?: {
    classNameVarRegexp?: string
    varNameVarRegexp?: string,
    classNameTsxPropRegexp?: string
    pattern?: string
    maxCounter?: number
    maxRandomRetries?: number
    defaultContextName?: string
  }
  include?: string | string[]
  output?: {
    indent?: number
    path?: string
    perFileCss?: boolean
    sourceFileNames?: boolean
  }
}

function config(stateOrInfo: TypiquePluginState | server.PluginCreateInfo): Config {
  return 'info' in stateOrInfo ? stateOrInfo.info.config : stateOrInfo.config
}

function generatedNamePattern(state: TypiquePluginState, kind: 'class' | 'var'): GeneratedNamePattern {
  return parseGeneratedNamePattern(generatedNamePatternStr(state, kind))
}

function generatedNamePatternStr(state: TypiquePluginState, kind: 'class' | 'var') {
  const pattern = String(config(state)?.generatedNames?.pattern ?? '${contextName}')
  return kind === 'var' ? `--${pattern}` : pattern
}

function checker(info: server.PluginCreateInfo) {
  return info.languageService.getProgram()?.getTypeChecker()
}

function scriptInfoAndSourceFile(info: server.PluginCreateInfo, fileName: string): {scriptInfo: server.ScriptInfo | undefined, sourceFile: SourceFile | undefined} {
  const scriptInfo = info.project.projectService.getScriptInfo(fileName)
  if (!scriptInfo) return {scriptInfo: undefined, sourceFile: undefined}
  const sourceFile = info.languageService.getProgram()?.getSourceFileByPath(scriptInfo.path)
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
    varNamesToFileSpans: new Map(),
    writing: Promise.resolve(),
    propertyToDoc: undefined,
  }
}

export function projectUpdated(state: TypiquePluginState) {
  const {added, updated, removed, isRewriteCss} = updateFilesState(
    state.info,
    state.filesState,
    state.classNamesToFileSpans,
    state.varNamesToFileSpans,
    fileName => processFile(state.info, fileName),
  )

  if (!isRewriteCss) {
    log(state.info, 'CSS is up-to-date', performance.now())
    return
  }

  function cssToBuffer(fileStates: (() => MapIterator<FileState>) | FileState, sourceName: string): Buffer {
    const started = performance.now()

    const _fileStates =
      () => typeof fileStates === 'function' ? fileStates() : [fileStates]

    let size = 0
    for (const fileState of _fileStates())
      size += fileState?.css?.size() ?? 0

    const buffer = Buffer.alloc(size)
    let targetOffset = 0
    for (const fileState of _fileStates())
      targetOffset += fileState?.css?.copyToBuffer(buffer, targetOffset) ?? 0

    log(state.info, `Extracted ${size} bytes of CSS from ${sourceName}`, started)
    return buffer
  }

  async function writeBufferToFile(buffer: Buffer, fileName: string) {
    const started = performance.now()

    if (!buffer.byteLength && !fs.existsSync(fileName)) {
      log(state.info, `Not writing ${fileName} because no CSS was extracted and the file does not exist`, started)
      return
    }

    const h = await fs.promises.open(fileName, 'w')
    try {
      await h.write(buffer)
    } finally {
      await h.close()
    }
    log(state.info, `Asynchronously written ${buffer.byteLength} bytes to ${fileName}`, started)
  }

  async function removeFile(fileName: string) {
    const started = performance.now()
    await fs.promises.unlink(fileName)
    log(state.info, `Asynchronously removed ${fileName}`, started)
  }

  function getSingleOutputFileName() {
    const targetRelName = config(state)?.output?.path ?? './typique-output.css'
    return path.join(path.dirname(state.info.project.getProjectName()), targetRelName)
  }

  const perFileCss = config(state)?.output?.perFileCss
  const fileNameAndBuffer = perFileCss
    ? [...added, ...updated].map(fileName => [replaceExtensionWithCss(fileName), cssToBuffer(state.filesState.get(fileName)!, fileName)] as const)
    : [[getSingleOutputFileName(), cssToBuffer(() => state.filesState.values(), `${state.filesState.size} project files`)] as const]

  const prevWriting = state.writing
  state.writing = (async () => {
    await prevWriting

    const promises: Promise<unknown>[] = []
    for (const [fileName, buffer] of fileNameAndBuffer)
      promises.push(writeBufferToFile(buffer, fileName))

    if (perFileCss)
      for (const r of removed)
        promises.push(removeFile(r))

    await Promise.all(promises)
  })()
}

export function updateFilesState(
  info: server.PluginCreateInfo,
  filesState: Map<server.NormalizedPath, FileState>,
  classNamesToFileSpans: Map<string, FileSpan[]>,
  varNamesToFileSpans: Map<string, FileSpan[]>,
  processFile: (fileName: server.NormalizedPath) => FileOutput | undefined,
): {
  added: server.NormalizedPath[]
  updated: server.NormalizedPath[]
  removed: server.NormalizedPath[]
  isRewriteCss: boolean
} {
  const started = performance.now()

  function addToNameToSpansMaps(fileOutput: FileOutput | undefined, fileName: server.NormalizedPath) {
    function addToMap(map: Map<string, FileSpan[]>, name: string, span: Span) {
      const fileSpan = {fileName, span} satisfies FileSpan
      if (map.has(name))
        map.get(name)!.push(fileSpan)
      else
        map.set(name, [fileSpan])
    }

    fileOutput?.classNameAndSpans?.forEach(({name, span}) => addToMap(classNamesToFileSpans, name, span))
    fileOutput?.varNameAndSpans?.forEach(({name, span}) => addToMap(varNamesToFileSpans, name, span))
  }

  function removeFromNameToSpansMaps(prevState: FileState | undefined, fileName: server.NormalizedPath) {
    function removeFromMap(map: Map<string, FileSpan[]>, name: string) {
      if (map.has(name)) {
        const updatedFileSpans = map.get(name)!.filter(fileSpan => fileSpan.fileName !== fileName)
        if (updatedFileSpans.length)
          map.set(name, updatedFileSpans)
        else
          map.delete(name)
      }
    }

    prevState?.classNames?.forEach(name => removeFromMap(classNamesToFileSpans, name))
    prevState?.varNames?.forEach(name => removeFromMap(varNamesToFileSpans, name))
  }

  const used = new Set<server.NormalizedPath>()
  const added = [] as server.NormalizedPath[]
  const updated = [] as server.NormalizedPath[]
  let isRewriteCss = filesState.size === 0

  for (const scriptInfo of info.project.getFileNames()
    .map(f => info.project.projectService.getScriptInfo(f))
    .filter(i => !!i)
  ) {
    const {fileName} = scriptInfo
    used.add(fileName)

    const prevState = filesState.get(fileName)
    const version = scriptInfo.getLatestVersion()
    if (prevState?.version === version) continue

    removeFromNameToSpansMaps(prevState, fileName)

    const fileOutput = processFile(fileName)

    filesState.set(fileName, {
      version,
      css: fileOutput?.css,
      classNames: new Set(fileOutput?.classNameAndSpans.map(({name}) => name)),
      varNames: new Set(fileOutput?.varNameAndSpans.map(({name}) => name)),
      diagnostics: fileOutput?.diagnostics ?? [],
    })
    addToNameToSpansMaps(fileOutput, fileName);

    (prevState ? updated : added).push(fileName)
    isRewriteCss ||= !areWritersEqual(fileOutput?.css, prevState?.css)
  }

  const removed = [] as server.NormalizedPath[]
  for (const fileName of filesState.keys()) {
    if (!used.has(fileName)) {
      const prevState = filesState.get(fileName)
      filesState.delete(fileName)
      removeFromNameToSpansMaps(prevState, fileName)

      removed.push(fileName)
      isRewriteCss ||= prevState != null
    }
  }

  log(info, `added: ${added.length}, updated: ${updated.length}, removed: ${removed.length} :: Currently tracking ${filesState.size} files`, started)

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
  varNameAndSpans: NameAndSpan[]
  diagnostics: Diagnostic[]
}

function processFile(
  info: server.PluginCreateInfo,
  fileName: server.NormalizedPath,
): FileOutput | undefined {
  const {sourceFile} = scriptInfoAndSourceFile(info, fileName)
  if (!sourceFile) return undefined

  const outputSourceFileNames = config(info).output?.sourceFileNames
  const srcRelativePath = path.relative(path.dirname(info.project.getProjectName()), sourceFile.fileName)
  const wr = new BufferWriter(
    defaultBufSize,
    outputSourceFileNames ?`/* src: ${srcRelativePath} */\n` : '',
    outputSourceFileNames ? `/* end: ${srcRelativePath} */\n` : '',
  )

  const diagnostics: Diagnostic[] = []

  function isPlainPropertyOrTuple(p: Type): boolean {
    return !!(p.flags & plainPropertyFlags) || !!checker(info)?.isTupleType(p)
  }

  function writeCssExpression(satisfiesExpr: SatisfiesExpression, classNameAndSpans: NameAndSpansObject, cssObject: ObjectType) {
    const usedReferences = new Set<string>()
    function resolveClassNameReferences(input: string, property: Symbol): string {
      const protectedRanges = findClassNameProtectedRanges(input)
      return input.replace(
        referenceRegExp(),
        (reference, offset) => {
          if (protectedRanges.some(([start, end]) => start <= offset && offset < end))
            return reference

          const className = resolveNameReference(reference, classNameAndSpans)
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
      const root = getRootReference(classNameAndSpans)
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

      const oneIndent = ' '.repeat(config(info)?.output?.indent ?? 2)
      const indent = (delta: number = 0) => oneIndent.repeat(nestingLevel + delta)

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

    const object = preprocessObject(undefined, cssObject)

    writeObjectAndNested({ruleHeader: undefined, object, nestingLevel: 0, parentSelector: undefined})

    for (const unusedName of getUnreferencedNames(usedReferences, classNameAndSpans)) {
      diagnostics.push({
        ...diagHeader,
        ...errorCodeAndMsg.unused,
        file: satisfiesExpr.getSourceFile(),
        ...toTextSpan(satisfiesExpr.getSourceFile(), unusedName.span),
      })
    }
  }

  const classNameAndSpans: NameAndSpan[] = []
  const varNameAndSpans: NameAndSpan[] = []

  function visit(node: Node) {
    if (ts.isSatisfiesExpression(node)) {
      const cssExpression = getCssExpression(info, node)
      if (cssExpression) {
        classNameAndSpans.push(...unfold(cssExpression.classNameAndSpans))
        diagnostics.push(...cssExpression.diagnostics)

        writeCssExpression(node, cssExpression.classNameAndSpans, cssExpression.cssObject)
      }

      const varExpression = getVarExpression(info, node)
      if (varExpression) {
        varNameAndSpans.push(...unfold(varExpression.varNameAndSpans))
        diagnostics.push(...varExpression.diagnostics)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return {
    css: wr.finalize(),
    classNameAndSpans,
    varNameAndSpans,
    diagnostics,
  }
}

type CssExpression = {
  classNameAndSpans: NameAndSpansObject
  diagnostics: Diagnostic[]
  cssObject: ObjectType
}

function getCssExpression(info: server.PluginCreateInfo, satisfiesExpr: SatisfiesExpression): CssExpression | undefined {
  const {expression: satisfiesLhs, type: satisfiesRhs} = satisfiesExpr

  if (!ts.isTypeReferenceNode(satisfiesRhs)
    || !isTypiqueTypeReference(info, satisfiesRhs, 'css')
    || satisfiesRhs.typeArguments?.length !== 1
  ) return

  const cssObjectNode = satisfiesRhs.typeArguments[0]
  if (!cssObjectNode || !ts.isTypeLiteralNode(cssObjectNode)) return

  const cssObject = checker(info)?.getTypeAtLocation(cssObjectNode)
  if (!((cssObject?.flags ?? 0) & ts.TypeFlags.Object)) return

  const {nameAndSpansObject: classNameAndSpans, diagnostics} = getNameAndSpansObjectWithDiag(info, satisfiesLhs)

  return {
    classNameAndSpans,
    diagnostics,
    cssObject: cssObject as ObjectType,
  }
}

type VarExpression = {
  varNameAndSpans: NameAndSpansObject
  diagnostics: Diagnostic[]
}

function getVarExpression(info: server.PluginCreateInfo, satisfiesExpr: SatisfiesExpression): VarExpression | undefined {
  const {expression: satisfiesLhs, type: satisfiesRhs} = satisfiesExpr

  if (!ts.isTypeReferenceNode(satisfiesRhs)
    || !isTypiqueTypeReference(info, satisfiesRhs, 'var')
  ) return

  const {nameAndSpansObject: varNameAndSpans, diagnostics} = getNameAndSpansObjectWithDiag(info, satisfiesLhs)

  return {
    varNameAndSpans,
    diagnostics,
  }
}

function getNameAndSpansObjectWithDiag(info: server.PluginCreateInfo, root: Node): {
  nameAndSpansObject: NameAndSpansObject
  diagnostics: Diagnostic[]
} {
  const diagnostics: Diagnostic[] = []

  function getNameAndSpansObject(node: Node): NameAndSpansObject {
    const createDiagnostic = (diagNode = node): Diagnostic => ({
      ...diagHeader,
      ...errorCodeAndMsg.satisfiesLhsUnexpected,
      file: diagNode.getSourceFile(),
      start: diagNode.getStart(),
      length: diagNode.getWidth(),
    })

    if (ts.isStringLiteral(node) || ts.isTemplateLiteral(node)) {
      const type = checker(info)?.getTypeAtLocation(node)
      if (type && (type.flags & ts.TypeFlags.StringLiteral)) {
        return {
          type: 'plain',
          nameAndSpan: {
            name: (type as StringLiteralType).value,
            span: getNodeSpan(node),
          },
        }
      } else {
        diagnostics.push(createDiagnostic())
        return {
          type: 'empty',
        }
      }
    }

    if (ts.isArrayLiteralExpression(node)) {
      return {
        type: 'array',
        nameAndSpans: node.elements.map(getNameAndSpansObject),
      }
    }

    if (ts.isObjectLiteralExpression(node)) {
      const items = node.properties
        .map(prop => {
          if (ts.isPropertyAssignment(prop)) {
            const {name, initializer} = prop
            return [name.getText(), getNameAndSpansObject(initializer)] satisfies [string, NameAndSpansObject]
          } else {
            diagnostics.push(createDiagnostic(prop))
            return undefined
          }
        })
        .filter(it => !!it)
      return {
        type: 'object',
        nameAndSpans: Object.fromEntries(
          items
            .map(([name, nameAndSpansObj]) => [
              name,
              nameAndSpansObj,
            ]),
        )
      }
    }

    if (ts.isSatisfiesExpression(node)) {
      // Internal `satisfies`, e.g. 'a' satisfies string satisfies Css<{...}>
      return getNameAndSpansObject(node.expression)
    }

    if (ts.isAsExpression(node)) {
      // 'b' as const satisfies Css<{...}>
      return getNameAndSpansObject(node.expression)
    }

    diagnostics.push(createDiagnostic())
    return {
      type: 'empty',
    }
  }

  const nameAndSpansObject = getNameAndSpansObject(root)

  return {nameAndSpansObject, diagnostics}
}

function isTypiqueTypeReference(
  info: server.PluginCreateInfo,
  typeReference: TypeReferenceNode,
  kind: 'css' | 'var' | 'any',
) {
  const type = checker(info)?.getTypeAtLocation(typeReference.typeName)
  if (!((type?.flags ?? 0) & ts.TypeFlags.Union)) return false
  
  const types = ((type?.flags ?? 0) & ts.TypeFlags.Union) && (type as UnionType).types
  if (!types || types.length !== 4) return false
  
  const brandedType = types[3]
  if (!(brandedType.flags & ts.TypeFlags.Object)) return false

  if ((kind === 'css' || kind === 'any') && brandedType.getProperty('__typiqueCssBrand') != null) return true
  if ((kind === 'var' || kind === 'any') && brandedType.getProperty('__typiqueVarBrand') != null) return true

  return false
}


export function getDiagnostics(state: TypiquePluginState, fileName: string): Diagnostic[] {
  const started = performance.now()

  function* genDiagnosticsImpl(): IterableIterator<Diagnostic> {
    const {scriptInfo, sourceFile} = scriptInfoAndSourceFile(state.info, fileName)
    if (!scriptInfo || !sourceFile) return

    for (const {kind, name, span, otherSpans} of getNamesInFile(state, scriptInfo)) {
      const common = {
        ...diagHeader,
        file: sourceFile,
        ...toTextSpan(sourceFile, span),
      }

      const stringLiteral = findStringLiteralLikeAtPosition(sourceFile, ts.getPositionOfLineAndCharacter(sourceFile, span.start.line, span.start.character))
      if (stringLiteral) {
        const contextNames = forceKind(kind, getContextNames(state, stringLiteral, 'fix'))
        if (contextNames && !nameMatchesPattern(name, contextNames.stringCtxName.parts, generatedNamePattern(state, kind))) {
          const {arrayCtxNames} = contextNames
          yield {
            ...common,
            ...errorCodeAndMsg.doesNotSatisfy(name, generatedNamePatternStr(state, kind)),
            relatedInformation: [{
              ...common,
              ...errorCodeAndMsg.contextNameEvaluatedTo(
                !arrayCtxNames
                  ? contextNameToString(contextNames.stringCtxName)
                  : JSON.stringify(arrayCtxNames.map(contextNameToString)),
              ),
            }]
          }
        }
      }

      if (otherSpans.length) {
        yield {
          ...common,
          ...errorCodeAndMsg.duplicate(name),
          relatedInformation: otherSpans
            .map(({fileName, span}) => {
              const {sourceFile} = scriptInfoAndSourceFile(state.info, fileName)
              if (!sourceFile) return undefined
    
              return {
                ...diagHeader,
                ...errorCodeAndMsg.alsoDeclared(name),
                file: sourceFile,
                ...toTextSpan(sourceFile, span),
              }
            })
            .filter(i => !!i),
        }
      }
    }
  }

  function getOtherDiagnostics() {
    const {scriptInfo} = scriptInfoAndSourceFile(state.info, fileName)
    if (!scriptInfo) return []
    return state.filesState.get(scriptInfo.fileName)?.diagnostics ?? []
  }

  const diagnostics = [...genDiagnosticsImpl(), ...getOtherDiagnostics()]
  log(state.info, `Got ${diagnostics.length} diagnostics`, started)
  return diagnostics
}

export function getCodeFixes(state: TypiquePluginState, fileName: string, start: number, end: number, errorCodes: readonly number[]): CodeFixAction[] {
  const started = performance.now()

  function* genCodeFixesImpl(): IterableIterator<CodeFixAction> {
    const {scriptInfo, sourceFile} = scriptInfoAndSourceFile(state.info, fileName)
    if (!scriptInfo || !sourceFile) return []

    const requestSpan = getSpan(sourceFile, start, end)

    for (const {kind, name, span, otherSpans} of getNamesInFile(state, scriptInfo)) {
      if (!areSpansIntersecting(span, requestSpan)) continue

      const stringLiteral = findStringLiteralLikeAtPosition(sourceFile, ts.getPositionOfLineAndCharacter(sourceFile, span.start.line, span.start.character))
      if (!stringLiteral) continue

      const contextNames = forceKind(kind, getContextNames(state, stringLiteral, 'fix'))
      if (!contextNames) continue

      if (errorCodes.includes(errorCodeAndMsg.doesNotSatisfy('', '').code) && !nameMatchesPattern(name, contextNames.stringCtxName.parts, generatedNamePattern(state, kind))
        || otherSpans.length && errorCodes.includes(errorCodeAndMsg.duplicate('').code)
      ) {
        for (const newText of getNamesSuggestions(state, stringLiteral, contextNames)) {
          yield {
            ...actionDescriptionAndName.change(name, newText),
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


type NameInFile = {
  kind: 'class' | 'var'
  name: string
  span: Span
  otherSpans: FileSpan[]
}

function* getNamesInFile(state: TypiquePluginState, scriptInfo: server.ScriptInfo): IterableIterator<NameInFile> {
  const fileState = state.filesState.get(scriptInfo.fileName)
  if (!fileState) return

  const {classNames, varNames} = fileState

  for (const [kind, names, namesToFileSpans] of [
    ['class', classNames ?? new Set(), state.classNamesToFileSpans],
    ['var', varNames ?? new Set(), state.varNamesToFileSpans]
  ] as const) {
    for (const name of names) {
      const fileSpans = namesToFileSpans.get(name) ?? []
      for (const fileSpan of fileSpans) {
        if (fileSpan.fileName === scriptInfo.fileName) {
          yield {
            kind,
            name,
            span: fileSpan.span,
            otherSpans: fileSpans.filter(otherFileSpan => fileSpan !== otherFileSpan)
          }
        }
      }
    }
  }
}

export function getCompletions(state: TypiquePluginState, fileName: string, position: number): ts.CompletionEntry[] {
  const started = performance.now()

  function getCompletionsImpl(): ts.CompletionEntry[] | undefined {
    const {names, stringLiteral, sourceFile, contextNames} = getNameCompletionsAndContext(state, fileName, position)
    if (stringLiteral && sourceFile && contextNames) {
      const namesNode = getNamesNodeIfNoCssOrVarExpr(state, stringLiteral)

      const insertSatisfiesNow = namesNode === stringLiteral
      const insertSatisfiesInCodeAction = namesNode && isInsertSatisfiesInCodeAction(stringLiteral, namesNode, sourceFile)

      const ctxNameKind = contextNames.stringCtxName.kind ?? 'class'
      const insertImportInCodeAction = !!getImportInsertion(sourceFile, ctxNameKind)

      const quote = getQuote(stringLiteral, sourceFile)
      const satisfiesRhs = ctxNameKind === 'class' ? 'Css<{}>' : 'Var'

      return names.map((name, i, arr) => ({
        name,
        ...insertSatisfiesNow ? {
          insertText: `${quote}${name}${quote} satisfies ${satisfiesRhs}`,
          replacementSpan: {
            start: stringLiteral.getStart(sourceFile),
            length: stringLiteral.getWidth(),
          },
        } : {},
        ...insertSatisfiesInCodeAction || insertImportInCodeAction ? {
          hasAction: true,
        } : {},
        sortText: padZeros(i, arr.length - 1),
        kind: ts.ScriptElementKind.string,
      }))
    }
  }

  const classNames = getCompletionsImpl() ?? []
  log(state.info, `Got ${classNames.length} completion items`, started)
  return classNames
}

export function getCodeActions(state: TypiquePluginState, fileName: string, position: number, entryName: string, formatOptions: ts.FormatCodeSettings | ts.FormatCodeOptions | undefined, preferences: ts.UserPreferences | undefined): CodeAction[] | undefined {
  const started = performance.now()

  function* getCodeActionsImpl(): Generator<CodeAction> {
    const {names, stringLiteral, sourceFile, contextNames} = getNameCompletionsAndContext(state, fileName, position)
    if (names.includes(entryName) && stringLiteral && sourceFile && contextNames) {
      const importInsertion = getImportInsertion(sourceFile, contextNames.stringCtxName.kind ?? 'class')
      if (importInsertion) {
        const {pos, insertionKind, importedIdentifier, isLeadingNewline} = importInsertion

        const inBracesSpace = (formatOptions as ts.FormatCodeSettings)?.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces ? ' ' : ''
        const quote = preferences?.quotePreference === 'single' ? '\''
          : preferences?.quotePreference === 'double' ? '"'
          : getQuote(stringLiteral, sourceFile)
        const newLineCharacter = (formatOptions as ts.FormatCodeSettings)?.newLineCharacter || '\n'
        const leadingNewline = isLeadingNewline ? newLineCharacter : ''
        const trailingNewline = isLeadingNewline ? '' : newLineCharacter
        const semicolon = (formatOptions as ts.FormatCodeSettings)?.semicolons === 'insert' ? ';' : ''

        const newText = insertionKind === 'create'
          ? `${leadingNewline}import type {${inBracesSpace}${importedIdentifier}${inBracesSpace}} from ${quote}typique${quote}${semicolon}${trailingNewline}`
          : `, ${importedIdentifier}`
        const description = insertionKind === 'create'
          ? newText
          : `Update import from ${quote}typique${quote}`
        yield {
          description,
          changes: [{
            fileName,
            textChanges: [{
              span: {
                start: pos,
                length: 0,
              },
              newText,
            }]
          }]
        }
      }

      const namesNode = getNamesNodeIfNoCssOrVarExpr(state, stringLiteral)
      if (namesNode && isInsertSatisfiesInCodeAction(stringLiteral, namesNode, sourceFile)) {
        const newText = contextNames.stringCtxName.kind === 'class'
          ? ' satisfies Css<{}>'
          : ' as const satisfies Var'
        yield {
          description: newText.trim(),
          changes: [{
            fileName,
            textChanges: [{
              span: {
                start: namesNode.getEnd(),
                length: 0,
              },
              newText,
            }]
          }]
        }
      }
    }
 }

  const codeActions = [...getCodeActionsImpl()]
  log(state.info, `Got ${codeActions?.length ?? 0} code actions`, started)
  return codeActions
}

function isInsertSatisfiesInCodeAction(stringLiteral: StringLiteralLike, namesNode: Node, sourceFile: SourceFile) {
  if (namesNode === stringLiteral) return false
  const stringLiteralEndLine = ts.getLineAndCharacterOfPosition(sourceFile, stringLiteral.getEnd()).line
  const namesNodeEndLine = ts.getLineAndCharacterOfPosition(sourceFile, namesNode.getEnd()).line
  // TODO Editors cannot insert codeActions on the same line -- use replacementSpan instead
  return stringLiteralEndLine !== namesNodeEndLine
}

function getImportInsertion(sourceFile: SourceFile, kind: 'class' | 'var'): {
  pos: number
  insertionKind: 'create' | 'update'
  importedIdentifier: string
  isLeadingNewline?: boolean
} | undefined {
  const importedIdentifier = kind === 'class' ? 'Css' : 'Var'
  let importStmtInsertionPos = 0
  let isLeadingNewline = false

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === 'typique') {
        const {namedBindings} = statement.importClause ?? {}
        if (namedBindings && ts.isNamedImports(namedBindings) && namedBindings.elements.length) {
          if (namedBindings.elements.some(el => el.name.text === importedIdentifier))
            return undefined

          return {
            pos: namedBindings.elements[namedBindings.elements.length - 1].getEnd(),
            insertionKind: 'update',
            importedIdentifier,
          }
        }
      }

      importStmtInsertionPos = statement.getEnd()
      isLeadingNewline = true
    } else {
      if (importStmtInsertionPos) break

      importStmtInsertionPos = statement.getStart()
      isLeadingNewline = false
      break
    }
  }

  return {
    pos: importStmtInsertionPos,
    insertionKind: 'create',
    importedIdentifier,
    isLeadingNewline,
  }
}

function getNameCompletionsAndContext(state: TypiquePluginState, fileName: string, position: number): {
  names: string[]
  stringLiteral?: StringLiteralLike
  sourceFile?: SourceFile
  contextNames?: ContextNames
} {
  const empty = () => ({names: []})

  const {sourceFile} = scriptInfoAndSourceFile(state.info, fileName)
  if (!sourceFile) return empty()
  const stringLiteral = findStringLiteralLikeAtPosition(sourceFile, position)
  if (!stringLiteral || stringLiteral.getStart() === position) return empty()
  const contextNames = getContextNames(state, stringLiteral, 'completion')
  if (!contextNames) return empty()
  const names = [...getNamesSuggestions(state, stringLiteral, contextNames)]
  return {names, stringLiteral, sourceFile, contextNames}
}

function getNamesNodeIfNoCssOrVarExpr(state: TypiquePluginState, stringLiteral: StringLiteralLike): Node | undefined {
  let node = stringLiteral.parent
  let lastNamesNodeCandidate: Node = stringLiteral
  while (node) {
    if (ts.isSatisfiesExpression(node)) {
      const {type} = node
      if (ts.isTypeReferenceNode(type) && isTypiqueTypeReference(state.info, type, 'any')) {
        return undefined
      }
      lastNamesNodeCandidate = node
      node = node.parent
    } else if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node) || ts.isAsExpression(node)) {
      lastNamesNodeCandidate = node
      node = node.parent
    } else if (ts.isPropertyAssignment(node)) {
      node = node.parent
    } else {
      return lastNamesNodeCandidate
    }
  }
}

function* getNamesSuggestions(state: TypiquePluginState, stringLiteral: StringLiteralLike, contextNames: ContextNames): IterableIterator<string> {
  const sourceFile = stringLiteral?.getSourceFile()
  if (!sourceFile) return []

  const kind = [contextNames.stringCtxName, ...contextNames.arrayCtxNames ?? []].filter(contextName => contextName.kind)[0]?.kind ?? 'class'

  const renderCommonParamsExceptPattern = {
    pattern: generatedNamePattern(state, kind),
    isUsed: cn => kind == 'class' ? state.classNamesToFileSpans.has(cn) : state.varNamesToFileSpans.has(cn),
    maxCounter: Number(config(state)?.generatedNames?.maxCounter ?? 999),
    maxRandomRetries: Number(config(state)?.generatedNames?.maxRandomRetries ?? 9),
    randomGen: () => Math.random(),
  } satisfies GenerateCommonParams

  const {arrayCtxNames} = contextNames
  if (arrayCtxNames && arrayCtxNames.length > 1) {
    const contextNamesFirstVariants = arrayCtxNames
      .map(contextName => getContextNameVariants(contextName.parts).next().value)
    if (!contextNamesFirstVariants.length || !contextNamesFirstVariants.every(contextName => contextName != null)) return

    const multipleVarsClassNames = generateNamesForMultipleVars(contextNamesFirstVariants, renderCommonParamsExceptPattern)
    const quote = getQuote(stringLiteral, sourceFile)
    yield multipleVarsClassNames.join(`${quote}, ${quote}`)
    // fall-through
  }

  yield* generateNamesForOneVar([...getContextNameVariants(contextNames.stringCtxName.parts)], renderCommonParamsExceptPattern)
}

function getQuote(stringLiteral: StringLiteralLike, sourceFile: SourceFile) {
  return sourceFile.text[stringLiteral.getStart(sourceFile)]
}

type ContextNames = {
  stringCtxName: ContextName
  arrayCtxNames?: ContextName[]
}

type ContextName = {
  kind: 'class' | 'var' | undefined
  parts: ContextNamePart[]
}

function contextNameToString(contextName: ContextName) {
  return contextName.parts.map(({text}) => text).join('/')
}

// TODO fixes when length > 1
function getContextNames(state: TypiquePluginState, stringLiteral: StringLiteralLike, mode: 'completion' | 'fix'): ContextNames | undefined {
  const sourceFile = stringLiteral?.getSourceFile()
  if (!sourceFile) return undefined

  let currentName: ContextName = {
    kind: undefined,
    parts: [],
  }
  let tsxPropNameAlreadyMatched = false

  function isMatchingRegexpStillRequired() {
    return mode === 'completion' && !tsxPropNameAlreadyMatched
  }


  function prepend(name: string | undefined, sourceKind: ContextNamePart['sourceKind'], kind?: 'class' | 'var'): ContextName {
    const {parts} = currentName
    const newParts = !name && !parts.length ? [{sourceKind, text: config(state)?.generatedNames?.defaultContextName ?? 'cn'}]
      : name && parts.length ? [{sourceKind, text: name}, ...parts]
      : name && !parts.length ? [{sourceKind, text: name}]
      : parts
    const newKind = kind ?? currentName.kind
    return {
      parts: newParts,
      kind: newKind,
    }
  }

  let currentNode: Node = stringLiteral
  while (currentNode) {
    if (ts.isPartOfTypeNode(currentNode))
      return undefined

    if (ts.isPropertyAssignment(currentNode)) {
      currentName = prepend(currentNode.name.getText(sourceFile), 'objectPropertyName')
    } else if (ts.isJsxAttribute(currentNode) && !tsxPropNameAlreadyMatched) {
      const attrName = currentNode.name.getText(sourceFile)
      const classNameTsxPropRegexp = config(state)?.generatedNames?.classNameTsxPropRegexp ?? '^class(Name)?$'

      if (attrName.match(classNameTsxPropRegexp)) {
        tsxPropNameAlreadyMatched = true
        currentName.kind = 'class'
      } else if (isMatchingRegexpStillRequired()) {
        return undefined
      }
    } else if (ts.isJsxElement(currentNode)) {
      currentName = prepend(currentNode.openingElement.tagName.getText(sourceFile), 'jsxElementName')
    } else if (ts.isVariableStatement(currentNode)) {
      const bindingNames = getBindingNames(currentNode)
      if (!bindingNames?.length)
        return isMatchingRegexpStillRequired() ? undefined : {stringCtxName: prepend(undefined, 'variableName')}

      const payloadsByClassName = bindingNames.map(bindingName =>
        getNamePayloadIfMatches(
          bindingName,
          config(state)?.generatedNames?.classNameVarRegexp ?? 'Class(es)?([Nn]ames?)?$'
        )
      )
      const payloadsByVarName = bindingNames.map(bindingName =>
        getNamePayloadIfMatches(
          bindingName,
          config(state)?.generatedNames?.varNameVarRegexp ?? 'Vars?([Nn]ames?)?$'
        )
      )
      if (isMatchingRegexpStillRequired() && [...payloadsByClassName, ...payloadsByVarName].every(p => p == null))
        return undefined

      const payloads = bindingNames.map((bindingName, i) => payloadsByClassName[i] ?? payloadsByVarName[i] ?? bindingName)
      const kinds = bindingNames.map((_, i) => (payloadsByClassName[i] != null) ? 'class' : (payloadsByVarName[i] != null) ? 'var' : undefined)
      const kind = (i: number): 'class' | 'var' | undefined => {
        const k = kinds[i]
        if (k || i <= 0 || i >= kinds.length - 1) return k
        return kind(i - 1) ?? kind(i + 1)
      }

      const arrayLiteral = stringLiteral.parent
      if (arrayLiteral && ts.isArrayLiteralExpression(arrayLiteral)) {
        const payloadsExtended = Array.from(
          {length: Math.max(payloads.length, arrayLiteral.elements.length)},
          (_, i) => payloads[i],
        )

        const arrayCtxNames = payloadsExtended.map((p, i) => prepend(p, 'variableName', kind(i)))
        const stringLiteralPos = arrayLiteral.elements.indexOf(stringLiteral)
        return {
          stringCtxName: arrayCtxNames[stringLiteralPos],
          arrayCtxNames: stringLiteralPos === 0 && arrayLiteral.elements.length === 1 ? arrayCtxNames : undefined,
        }
      }

      return {stringCtxName: prepend(payloads[0], 'variableName',  kinds[0])}
    } else if (ts.isFunctionDeclaration(currentNode)) {
      return isMatchingRegexpStillRequired()
        ? undefined
        : {stringCtxName: prepend(currentNode.name?.getText(), 'functionName')}
    }

    currentNode = currentNode.parent
  }

  return isMatchingRegexpStillRequired() ? undefined : {stringCtxName: prepend(undefined, 'default')}
}

function forceKind(kind: 'class' | 'var', contextNames?: ContextNames): ContextNames | undefined {
  if (!contextNames) return undefined

  return {
    stringCtxName: {
      ...contextNames.stringCtxName,
      kind,
    },
    arrayCtxNames: contextNames.arrayCtxNames?.map(cn => ({
      ...cn,
      kind,
    }))
  }
}

function getBindingNames(statement: VariableStatement): (string | undefined)[] | undefined {
  if (statement.declarationList.declarations.length !== 1) return

  const {name: bindingName} = statement.declarationList.declarations[0]
  if (ts.isArrayBindingPattern(bindingName)) {
    return bindingName.elements
      .map(el => {
        if (!ts.isBindingElement(el)) return undefined
        const elBindingName = el.name
        if (!ts.isIdentifier(elBindingName)) return undefined
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

export function getWorkaroundCompletions(state: TypiquePluginState, fileName: string, position: number, prior: CompletionEntry[]): ts.CompletionEntry[] {
  const started = performance.now()
  const workaroundCompletions = [...getWorkaroundCompletionsImpl(state, fileName, position, prior)]
  log(state.info, `Got ${workaroundCompletions.length} workaround completion items`, started)
  return workaroundCompletions
}

// https://github.com/microsoft/TypeScript/issues/62117
// TODO also completion in values. Or own completion
// TODO test that ,-separated are not affected (once?)
function* getWorkaroundCompletionsImpl(state: TypiquePluginState, fileName: string, position: number, prior: CompletionEntry[]): Generator<ts.CompletionEntry> {
  if (prior.length >= 10) return

  const completionContext = getPropertyWorkaroundCompletionContext(state, fileName, position, 'end')
  if (!completionContext) return

  const {identifierText, typiqueCssTypeRef} = completionContext

  const propsMap = getCssPropToDocsMap(state, typiqueCssTypeRef)
  if (!propsMap) return

  const propsMapKeys = [...propsMap.keys()]
  for (let i = 0; i < propsMapKeys.length; i++) {
    const name = propsMapKeys[i]
    if (prior.some(e => e.name === name)) return
    if (name.startsWith(identifierText))
      yield {
        name,
        sortText: padZeros(i, propsMapKeys.length - 1),
        kind: ts.ScriptElementKind.memberVariableElement,
      }
  }
}

export function getWorkaroundCompletionDocumentation(state: TypiquePluginState, fileName: string, position: number, name: string): SymbolDisplayPart[] | undefined {
  const started = performance.now()
  const documentation = getWorkaroundCompletionDocumentationImpl(state, fileName, position, name)
  log(state.info, `Got workaround completion documentation length=${documentation?.length ?? 0} for '${name}'`, started)
  return documentation
}

function getWorkaroundCompletionDocumentationImpl(state: TypiquePluginState, fileName: string, position: number, name: string): SymbolDisplayPart[] | undefined {
  const completionContext = getPropertyWorkaroundCompletionContext(state, fileName, position, 'anywhere')
  if (!completionContext) return

  const {typiqueCssTypeRef} = completionContext

  return getCssPropToDocsMap(state, typiqueCssTypeRef)?.get(name)
}

function getPropertyWorkaroundCompletionContext(state: TypiquePluginState, fileName: string, position: number, positionInsideIdentifier: 'anywhere' | 'end'): {
  identifierText: string
  typiqueCssTypeRef: TypeReferenceNode
} | undefined {
  const {scriptInfo, sourceFile} = scriptInfoAndSourceFile(state.info, fileName)
  if (!scriptInfo || !sourceFile) return

  const identifier = findIdentifierAtPosition(sourceFile, position, positionInsideIdentifier)
  if (!identifier) return

  const identifierText = identifier.getText()
  if (!identifierText) return

  const propertySignature = identifier.parent
  if (!propertySignature || !ts.isPropertySignature(propertySignature)) return

  const typeLiteral = propertySignature.parent
  if (!typeLiteral || !ts.isTypeLiteralNode(typeLiteral)) return

  const propertyIndex = typeLiteral.members.indexOf(propertySignature)

  if (propertyIndex < 1) return
  const prevPropertyText = typeLiteral.members[propertyIndex - 1]?.getText()?.trimEnd()

  if (!prevPropertyText || prevPropertyText.endsWith(',') || prevPropertyText.endsWith(';')) return
  
  let node = typeLiteral.parent
  while (node) {
    if (ts.isTypeReferenceNode(node) && isTypiqueTypeReference(state.info, node, 'css'))
      return {
        identifierText,
        typiqueCssTypeRef: node,
      }
    node = node.parent
  }
}

function getCssPropToDocsMap(state: TypiquePluginState, typiqueCssTypeRef: TypeReferenceNode) {
  if (!state.propertyToDoc) {
    const csstypeType = checker(state.info)?.getTypeAtLocation(typiqueCssTypeRef)?.aliasTypeArguments?.[0]
    if (!csstypeType) return

    state.propertyToDoc = new Map()
    for (const p of csstypeType.getProperties()) {
      const doc = p.getDocumentationComment(checker(state.info))
      state.propertyToDoc.set(p.getName(), doc)
    }
  }

  return state.propertyToDoc
}
