import ts, { DiagnosticRelatedInformation } from 'typescript/lib/tsserverlibrary'
import type { BindingName, ObjectType, StringLiteralType, Path, server, Statement, SatisfiesExpression, SourceFile, Symbol, Identifier, NumberLiteralType, Type, TupleType, LineAndCharacter, Diagnostic } from 'typescript/lib/tsserverlibrary'
import fs from 'node:fs'
import path from 'node:path'
import { areWritersEqual, BufferWriter, defaultBufSize } from './BufferWriter'
import { camelCaseToKebabCase, findClassNameProtectedRanges } from './util'


export type LaimPluginState = {
  info: server.PluginCreateInfo
  filesState: Map<Path, FileState>
  labelToFileSpans: Map<string, FileSpan[]>
  writing: Promise<void>
}

type FileState = {
  version: string
  css: BufferWriter | undefined
  labels: string[] | undefined
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

function checker(info: server.PluginCreateInfo) {
  return info.languageService.getProgram()?.getTypeChecker()
}

function log(info: server.PluginCreateInfo, msg: string) {
  info.project.projectService.logger.info(`LaimPlugin:: ${msg} :: Project ${info.project.getProjectName()}`)
}

export function createLaimPluginState(info: server.PluginCreateInfo): LaimPluginState {
  return {
    info,
    filesState: new Map(),
    labelToFileSpans: new Map(),
    writing: Promise.resolve(),
  }
}

export function projectUpdated(p: LaimPluginState) {
  const cssUpdated = updateFilesState(p.info, p.filesState, p.labelToFileSpans);

  const fileName = path.join(path.dirname(p.info.project.getProjectName()), 'laim-output.css')
  if (!cssUpdated) {
    log(p.info, `${fileName} is up-to-date`)
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
    log(p.info, `Written ${written} bytes to ${fileName} in ${performance.now() - started} ms`)
  })()
}

function updateFilesState(
  info: server.PluginCreateInfo,
  filesState: Map<Path, FileState>,
  labelToFileSpans: Map<string, FileSpan[]>,
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

    for (const label of prevState?.labels ?? []) {
      if (labelToFileSpans.has(label)) {
        const updatedSpans = labelToFileSpans.get(label)!.filter(sp => sp.path !== path)
        if (updatedSpans.length)
          labelToFileSpans.set(label, updatedSpans)
        else
          labelToFileSpans.delete(label)
      }
    }

    const fileOutput = processFile(info, info.project.getSourceFile(path))
    filesState.set(path, {
      version,
      css: fileOutput?.css,
      labels: [...new Set(fileOutput?.labelAndSpans.map(({label}) => label))],
    })

    for (const {label, span} of fileOutput?.labelAndSpans ?? []) {
      if (labelToFileSpans.has(label))
        labelToFileSpans.get(label)!.push({fileName, path, span})
      else
        labelToFileSpans.set(label, [{fileName, path, span}])
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

  log(info, `added: ${added}, updated: ${updated}, removed: ${removed} in ${performance.now() - started} ms :: Currently tracking ${filesState.size} files`)
  return isRewriteCss
}

const plainPropertyFlags = ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral | ts.TypeFlags.Null | ts.TypeFlags.BooleanLiteral

type FileOutput = {
  css: BufferWriter | undefined
  labelAndSpans: LabelAndSpan[]
}

type LabelAndSpan = {
  label: string
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
  const labelAndSpans: LabelAndSpan[] = []

  function isPlainPropertyOrTuple(p: Type): boolean {
    return !!(p.flags & plainPropertyFlags) || !!checker(info)?.isTupleType(p)
  }

  function writeStatement(statement: Statement, varOrCall: CssCall | CssVar) {
    labelAndSpans.push(varOrCall.labelAndSpan)

    const generateNames = function* () {
      for (let i = 0; i < 99; i++)
        yield `${info.config.prefix ?? ''}${varOrCall.labelAndSpan.label}-${i}`
      throw new Error('Possibly endless object')
    }()

    const rewrittenNames = new Map<string, string>() // not including root
    function rewriteNames(header: string, location: 'header' | 'value') {
      const protectedRanges = findClassNameProtectedRanges(header)
      const regexp = location === 'header'
        ? /(\.|\$\$|%%)([a-zA-Z_-][0-9a-zA-Z_-]*)/g
        : /(%%)([a-zA-Z_-][0-9a-zA-Z_-]*)/g
      return header.replace(
        regexp,
        (whole, prefix, name, offset) => {
          if (protectedRanges.some(([start, end]) => start <= offset && offset < end)) {
            return whole
          }
          if (prefix === '$$') {
            return name
          }

          const prefixOut = prefix === '.' ? '.' : ''
          const rewritten = rewrittenNames.get(name)
          if (rewritten != null) {
            return prefixOut + rewritten
          }

          const newRewritten = generateNames.next().value
          rewrittenNames.set(name, newRewritten)
          return prefixOut + newRewritten
        }
      )
    }

    type PreprocessedObject = {
      [propertyName: string]: string | (string | null)[] | PreprocessedObject | null
    }

    function convertPlainProperty(p: Type): string | null {
      if (p.flags & ts.TypeFlags.StringLiteral) {
        const valueStr = (p as StringLiteralType).value
        return rewriteNames(valueStr, 'value')
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

      function getPropertyTargetObject(propName: string, propType: Type): PreprocessedObject {
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
          rootClassPropName ??= `.${generateNames.next().value}`
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
        property.getDeclarations()
        const propertyName = rewriteNames(property.getName(), 'header')
        const propertyType = checker(info)!.getTypeOfSymbolAtLocation(property, statement)
        const propertyTarget = getPropertyTargetObject(propertyName, propertyType)

        if (checker(info)!.isTupleType(propertyType)) {
          propertyTarget[camelCaseToKebabCase(propertyName)] = checker(info)!.getTypeArguments(propertyType as TupleType)
            .map(t => {
              if (t.flags & plainPropertyFlags) {
                return convertPlainProperty(t)
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
          propertyTarget[camelCaseToKebabCase(propertyName)] = convertPlainProperty(propertyType)
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
  }

  for (const statement of sourceFile.statements) {
    const cssVarOrCall = getCssExpression(info, statement)
    if (cssVarOrCall) {
      writeStatement(statement, cssVarOrCall)
    }
  }

  return {css: wr.finallize(), labelAndSpans}
}


type CssVar = {
  bindingName: BindingName
} & CssCall

type CssCall = {
  labelAndSpan: LabelAndSpan
  cssObject: ObjectType
}

function getCssExpression(
  info: server.PluginCreateInfo,
  statement: Statement,
): CssCall | CssVar | void {
  function getCssCall(satisfiesExpr: SatisfiesExpression): CssCall | void {
    const {expression: satisfiesLhs, type: satisfiesRhs} = satisfiesExpr
    if (!ts.isCallExpression(satisfiesLhs)) return

    const {expression: callee, arguments: args} = satisfiesLhs
    if (!ts.isIdentifier(callee) || !ts.isTypeReferenceNode(satisfiesRhs) || args.length > 1) return
    const labelArg = args[0]

    const labelType = checker(info)?.getTypeAtLocation(labelArg)
    if (!((labelType?.flags ?? 0) & ts.TypeFlags.StringLiteral)) return

    const cssTypeNode = satisfiesRhs.typeArguments?.[0]
    if (!cssTypeNode || !ts.isTypeLiteralNode(cssTypeNode)) return

    if (!isLaimCssCall(info, callee)) return

    const cssType = checker(info)?.getTypeAtLocation(cssTypeNode)
    if (!cssType) return

    if (!(cssType.flags & ts.TypeFlags.Object)) return

    return {
      cssObject: cssType as ObjectType,
      labelAndSpan: {
        label: (labelType as StringLiteralType).value,
        span: {
          start: ts.getLineAndCharacterOfPosition(labelArg.getSourceFile(), labelArg.getStart()),
          end: ts.getLineAndCharacterOfPosition(labelArg.getSourceFile(), labelArg.getEnd())
        }
      }
    }
  }

  if (ts.isVariableStatement(statement)) {
    if (statement.declarationList.declarations.length !== 1) return

    const {name: bindingName, initializer} = statement.declarationList.declarations[0]
    if (!initializer || !ts.isSatisfiesExpression(initializer)) return

    const cssCall = getCssCall(initializer)
    if (!cssCall) return

    return {
      bindingName,
      ...cssCall
    }
  } else if (ts.isSatisfiesExpression(statement)) {
    return getCssCall(statement)
  }
}

function isLaimCssCall(info: server.PluginCreateInfo, callee: Identifier | undefined): boolean {
  if (!callee) return false

  const declaration = checker(info)?.getSymbolAtLocation(callee)?.declarations?.[0]
  if (!declaration) return false

  if (!ts.isImportSpecifier(declaration)) return false

  const importedName = declaration.propertyName ?? declaration.name
  if (importedName.getText() !== 'css') return false

  const importDeclaration = importedName.parent?.parent?.parent?.parent
  if (!ts.isImportDeclaration(importDeclaration)) return false

  const moduleSpecifier = importDeclaration.moduleSpecifier
  if (!ts.isStringLiteral(moduleSpecifier)) return false

  return moduleSpecifier.text === 'laim'
}

export function getDiagnostics(state: LaimPluginState, fileName: string): Diagnostic[] {
  const scriptInfo = state.info.project.projectService.getScriptInfo(fileName)
  if (!scriptInfo) return []
  const sourceFile = state.info.languageService.getProgram()?.getSourceFileByPath(scriptInfo.path)
  if (!sourceFile) return []

  const labels = state.filesState.get(scriptInfo.path)?.labels
  if (!labels) return []

  function getStartAndLength(sourceFile: SourceFile, fileSpan: FileSpan) {
    const startPos = ts.getPositionOfLineAndCharacter(sourceFile, fileSpan.span.start.line, fileSpan.span.start.character)
    const endPos = ts.getPositionOfLineAndCharacter(sourceFile, fileSpan.span.end.line, fileSpan.span.end.character)
    return {
      start: startPos,
      length: endPos - startPos
    }
  }

  return labels.flatMap(label => {
    const fileSpans = state.labelToFileSpans.get(label)!
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
              category: ts.DiagnosticCategory.Error,
              code: 0,
              file: otherSourceFile,
              messageText: `'${label}' is also here`,
              ...getStartAndLength(otherSourceFile, otherSpan),
            }
            return relatedInfo
          })
          .filter<DiagnosticRelatedInformation>(i => !!i)

        return {
          category: ts.DiagnosticCategory.Error,
          code: 0,
          source: 'laim',
          file: sourceFile,
          messageText: `The label '${label}' is not unique`,
          ...getStartAndLength(sourceFile, fileSpan),
          relatedInformation,
        } satisfies Diagnostic
      })
  })
}
