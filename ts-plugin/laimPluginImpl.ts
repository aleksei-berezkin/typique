import ts, { NumberLiteralType } from 'typescript/lib/tsserverlibrary'
import { BindingName, ObjectType, StringLiteralType, TypeFlags, Path, server, Statement, TypeChecker, SatisfiesExpression, LanguageService, SourceFile, Declaration, Identifier, DefinitionInfo } from 'typescript/lib/tsserverlibrary'
import fs from 'node:fs'
import path from 'node:path'
import { areWritersEqual, BufferWriter } from './BufferWriter'


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

    const css = getCss(languageService, project, project.getSourceFile(path))
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

function getCss(languageService: LanguageService, project: server.Project, sourceFile: SourceFile | undefined): BufferWriter | undefined {
  const checker = languageService.getProgram()?.getTypeChecker()
  if (!sourceFile || !checker) return undefined

  const wr = new BufferWriter()

  function writeObject(statement: Statement, getClassName: Iterator<string>, selectorOrQuery: string | undefined, object: ObjectType) {
    const selectorOrQueryImpl = selectorOrQuery ?? `.${getClassName.next().value}`
    wr.write(selectorOrQueryImpl, ' {\n')
    for (const property of object.getProperties()) {
      const declType = checker!.getTypeOfSymbolAtLocation(property, statement)
      const valText =
        declType.flags & ts.TypeFlags.StringLiteral ? (declType as StringLiteralType).value
        : declType.flags & ts.TypeFlags.NumberLiteral ? `${(declType as NumberLiteralType).value}px`
        : '(not a string literal)'
      wr.write('  ', property.getName(), ': ', valText, ';', '\n')
    }
    wr.write('}\n')
  }

  for (const statement of sourceFile.statements) {
    const cssVarOrCall = getCssExpression(languageService, project, statement)
    if (cssVarOrCall) {
      let counter = 0
      const getClassName = function* () {
        for ( ; ; ) yield `${cssVarOrCall.label}-${counter++}`
      }
      writeObject(statement, getClassName(), undefined, cssVarOrCall.cssObject)
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
