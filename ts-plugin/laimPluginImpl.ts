import ts from 'typescript/lib/tsserverlibrary'
import { BindingName, ObjectType, StringLiteralType, TypeFlags, Path, server, Statement, TypeChecker, SatisfiesExpression, LanguageService, SourceFile, Declaration, Identifier, DefinitionInfo, NumberLiteralType, Type } from 'typescript/lib/tsserverlibrary'
import fs from 'node:fs'
import path from 'node:path'
import { areWritersEqual, BufferWriter, defaultBufSize } from './BufferWriter'


export type LaimPluginState = {
  info: server.PluginCreateInfo
  filesState: Map<Path, FileState>
  writing: Promise<void>
}

type FileState = {
  version: string
  css: BufferWriter | undefined
}

const logPrefix = 'Laim plugin:'

export function createLaimPluginState(info: server.PluginCreateInfo): LaimPluginState {
  return {
    info,
    filesState: new Map(),
    writing: Promise.resolve(),
  }
}

export function projectUpdated(p: LaimPluginState) {
  const cssUpdated = updateFilesState(p.info.languageService, p.info.project, p.filesState);

  const fileName = path.join(path.dirname(p.info.project.getProjectName()), 'laim-output.css')
  if (!cssUpdated) {
    p.info.project.projectService.logger.info(`${logPrefix} ${fileName} is up-to-date`)
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
    p.info.project.projectService.logger.info(`${logPrefix} written ${written} bytes to ${fileName} in ${performance.now() - started} ms`)
  })()
}

function updateFilesState(
  languageService: LanguageService,
  project: server.Project,
  filesState: Map<Path, FileState>
): boolean {
  const checker = languageService.getProgram()?.getTypeChecker()
  if (!checker) return false

  const started = performance.now()

  const used = new Set<Path>()
  let added = 0
  let updated = 0
  let isRewriteFile = filesState.size === 0

  for (const name of project.getFileNames()) {
    const scriptInfo = project.projectService.getScriptInfo(name)
    if (!scriptInfo) continue

    const {path} = scriptInfo
    used.add(path)

    const prevState = filesState.get(path)
    const version = scriptInfo.getLatestVersion()
    if (prevState?.version === version) continue

    const css = getFileCss(languageService, project, checker, project.getSourceFile(path))
    filesState.set(path, {version, css})

    added += prevState ? 0 : 1
    updated += prevState ? 1 : 0
    isRewriteFile ||= !areWritersEqual(css, prevState?.css)
  }

  let removed = 0
  for (const path of filesState.keys()) {
    if (!used.has(path)) {
      const prevCss = filesState.get(path)?.css
      filesState.delete(path)

      removed++
      isRewriteFile ||= prevCss != null
    }
  }

  project.projectService.logger.info(`${logPrefix} added: ${added}, updated: ${updated}, removed: ${removed} in ${performance.now() - started} ms. Currently tracking ${filesState.size} files.`)
  return isRewriteFile
}

function getFileCss(
  languageService: LanguageService,
  project: server.Project,
  checker: TypeChecker,
  sourceFile: SourceFile | undefined
): BufferWriter | undefined {
  if (!sourceFile) return undefined

  const srcRelativePath = path.relative(path.dirname(project.getProjectName()), sourceFile.fileName)
  const wr = new BufferWriter(
    defaultBufSize,
    `/* src: ${srcRelativePath} */\n`,
    `/* end: ${srcRelativePath} */\n`,
  )

  function writeStatement(statement: Statement, varOrCall: CssCall | CssVar) {
    const targetNamesItr = function* () {
      for (let i = 0; i < 99; i++)
        yield `${varOrCall.label}-${i}`
      throw new Error('Possibly endless object')
    }()

    const rewrittenNames = new Map<string, string>() // not including root
    function rewriteNames(header: string, location: 'header' | 'value') {
      const regexp = location === 'header'
        ? /(\.|\$\$|%%)([a-zA-Z_-][0-9a-zA-Z_-]*)/g
        : /(%%)([a-zA-Z_-][0-9a-zA-Z_-]*)/g
      return header.replace(
        regexp,
        (_, prefix, name) => {
          if (prefix === '$$') {
            return name
          }

          const prefixOut = prefix === '.' ? '.' : ''
          const rewritten = rewrittenNames.get(name)
          if (rewritten != null) {
            return prefixOut + rewritten
          }

          const newRewritten = targetNamesItr.next().value
          rewrittenNames.set(name, newRewritten)
          return prefixOut + newRewritten
        }
      )
    }

    type PreprocessedObject = {
      [propertyName: string]: string | PreprocessedObject | null
    }

    /**
     * * Moves all root-scoped props to inside actual `.root-0 {...}`
     * * In conditional at-rules (`@media` etc) moves all non-obj props to inside additional `& {...}`
     * * Rewrites names
     */
    function preprocessObject(name: string | /* root */ undefined, type: ObjectType): PreprocessedObject {
      const target: PreprocessedObject = {}
      let rootClassPropName: string | undefined = undefined

      function getPropertyTargetObject(propName: string, propType: Type): PreprocessedObject {
        const isConditionalAtRule = (p: string) => ['@media', '@supports', '@container', '@layer', '@scope'].some(r => p.startsWith(r))

        if (name == null && (
            // { color: red; } => { .root-0 { color: red; } }
            !propName.startsWith('@') && !(propType.flags & TypeFlags.Object)
            // { &:hover {} } => { .root-0 { &:hover {} } }
            || propName.includes('&')
            || isConditionalAtRule(propName) && checker.getPropertiesOfType(propType).some(
              // { @media { & {} } } => { .root-0 { @media { & {} } }
              p => p.getName().includes('&')
                // { @media { color: red } } => { .root-0 { @media { color: red } } }
                || !(checker.getTypeOfSymbolAtLocation(p, statement).flags & TypeFlags.Object)
            )
        )) {
          rootClassPropName ??= `.${targetNamesItr.next().value}`
          const rootClassBody = target[rootClassPropName]
          if (typeof rootClassBody === 'string') {
            // { .root-0: red } -- doesn't make any sense -- TODO report error
            throw new Error(`${propName} in ${srcRelativePath}: .${rootClassPropName}: ${rootClassBody} not supported`)
          }
          return rootClassBody ?? (target[rootClassPropName] = {})
        }

        // @media() { color: red; } => @media() { & { color: red; } }
        if (name
            && isConditionalAtRule(name)
            && !(propType.flags & TypeFlags.Object)
        ) {
          const ampBody = target['&']
          if (typeof ampBody === 'string') {
            // { &: red } -- doesn't make any sense -- TODO report error
            throw new Error(`${propName} in ${srcRelativePath}: &: ${ampBody} not supported`)
          }
          return ampBody ?? (target['&'] = {})
        }

        return target
      }

      for (const property of type.getProperties()) {
        const propertyName = rewriteNames(property.getName(), 'header')
        const propertyType = checker.getTypeOfSymbolAtLocation(property, statement)
        const propertyTarget = getPropertyTargetObject(propertyName, propertyType)

        if (propertyType.flags & TypeFlags.Null) {
          propertyTarget[propertyName] = null
        } else if (propertyType.flags & TypeFlags.Object) {
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
        } else if (propertyType.flags & (TypeFlags.StringLiteral | TypeFlags.NumberLiteral)) {
          // TODO support boolean and null (layer declarations etc)
          const value = (propertyType as StringLiteralType | NumberLiteralType).value
          const valueStr = typeof value === 'number' && value !== 0 ? `${value}px` : String(value)
          propertyTarget[propertyName] = rewriteNames(valueStr, 'value')
        } else if (checker.isArrayType(propertyType)) {
          // TODO fallbacks - generate multiple entries with the same property
          // e.g.
          // width: ['100%', '-moz-available']
        } else {
          // Not supported - underline
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
        if (propertyValue == null || typeof propertyValue === 'string') {
          wr.write(
            indent(ruleHeaderImpl ? 1 : 0),
            propertyName, 
            ...propertyValue ? [': ', propertyValue] : [],
            ';\n'
          )
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
    const cssVarOrCall = getCssExpression(languageService, project, statement)
    if (cssVarOrCall) {
      writeStatement(statement, cssVarOrCall)
    }
  }

  return wr.finallize()
}


type CssVar = {
  bindingName: BindingName
} & CssCall

type CssCall = {
  label?: string
  cssObject: ObjectType
}

function getCssExpression(
  languageService: LanguageService,
  project: server.Project,
  statement: Statement,
): CssCall | CssVar | void {
  function getCssCall(satisfiesExpr: SatisfiesExpression): CssCall | void {
    const {expression: satisfiesLhs, type: satisfiesRhs} = satisfiesExpr
    if (!ts.isCallExpression(satisfiesLhs)) return

    const {expression: callee, arguments: args} = satisfiesLhs
    if (!ts.isIdentifier(callee) || !ts.isTypeReferenceNode(satisfiesRhs) || args.length > 1) return
    const label = args[0]
    if (label && !ts.isStringLiteral(label)) return

    const cssTypeNode = satisfiesRhs.typeArguments?.[0]
    if (!cssTypeNode || !ts.isTypeLiteralNode(cssTypeNode)) return

    if (!isLaimCssCall(languageService, project, callee)) return

    const cssType = languageService.getProgram()?.getTypeChecker().getTypeAtLocation(cssTypeNode)
    if (!cssType) return

    if (!(cssType.flags & ts.TypeFlags.Object)) return

    return {
      cssObject: cssType as ObjectType,
      label: label.text,
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

function isLaimCssCall(languageService: LanguageService, project: server.Project, callee: Identifier | undefined): boolean {
  if (!callee) return false
  const definitions = languageService.getDefinitionAtPosition(callee.getSourceFile().fileName, callee.getStart())
  return definitions?.some(def => def.name === 'css' && isCssSrcFileName(project, def.fileName)) || false
}

function isCssSrcFileName(project: server.Project, fileName: string) {
  const sourceFile = project.getSourceFile(project.projectService.toPath(fileName))
  if (!sourceFile) return false

  const firstStatement = sourceFile.statements[0]
  if (!firstStatement) return false

  if (!ts.isVariableStatement(firstStatement)
    || firstStatement.declarationList.declarations.length !== 1) return false

  const initializer = firstStatement.declarationList.declarations[0].initializer
  if (!initializer) return false

  if (!ts.isStringLiteral(initializer)) return false
  return initializer.text === 'LAIM_4MlxZY1HOx8U'
}
