import ts from 'typescript/lib/tsserverlibrary'
import type { BindingName, ObjectType, StringLiteralType, Path, server, Statement, TypeChecker, SatisfiesExpression, LanguageService, SourceFile, Symbol, Identifier, NumberLiteralType, Type } from 'typescript/lib/tsserverlibrary'
import fs from 'node:fs'
import path from 'node:path'
import { areWritersEqual, BufferWriter, defaultBufSize } from './BufferWriter'
import { findClassNameProtectedRanges } from './util'


export type LaimPluginState = {
  info: server.PluginCreateInfo
  filesState: Map<Path, FileState>
  writing: Promise<void>
}

type FileState = {
  version: string
  css: BufferWriter | undefined
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
    writing: Promise.resolve(),
  }
}

export function projectUpdated(p: LaimPluginState) {
  const cssUpdated = updateFilesState(p.info, p.filesState);

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
  filesState: Map<Path, FileState>
): boolean {
  const started = performance.now()

  const used = new Set<Path>()
  let added = 0
  let updated = 0
  let isRewriteFile = filesState.size === 0

  for (const name of info.project.getFileNames()) {
    const scriptInfo = info.project.projectService.getScriptInfo(name)
    if (!scriptInfo) continue

    const {path} = scriptInfo
    used.add(path)

    const prevState = filesState.get(path)
    const version = scriptInfo.getLatestVersion()
    if (prevState?.version === version) continue

    const css = getFileCss(info, info.project.getSourceFile(path))
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

  log(info, `added: ${added}, updated: ${updated}, removed: ${removed} in ${performance.now() - started} ms :: Currently tracking ${filesState.size} files`)
  return isRewriteFile
}

function getFileCss(
  info: server.PluginCreateInfo,
  sourceFile: SourceFile | undefined
): BufferWriter | undefined {
  if (!sourceFile) return undefined

  const srcRelativePath = path.relative(path.dirname(info.project.getProjectName()), sourceFile.fileName)
  const wr = new BufferWriter(
    defaultBufSize,
    `/* src: ${srcRelativePath} */\n`,
    `/* end: ${srcRelativePath} */\n`,
  )

  function writeStatement(statement: Statement, varOrCall: CssCall | CssVar) {
    const generateNames = function* () {
      for (let i = 0; i < 99; i++)
        yield `${info.config.prefix ?? ''}${varOrCall.label}-${i}`
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
            !propName.startsWith('@') && !(propType.flags & ts.TypeFlags.Object)
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
            && !(propType.flags & ts.TypeFlags.Object)
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

      function getPropertiesInOrder(): Symbol[] {
        const properties = type.getProperties()
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

        if (propertyType.flags & ts.TypeFlags.Object) {
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
        } else if (propertyType.flags & ts.TypeFlags.StringLiteral) {
          const valueStr = (propertyType as StringLiteralType).value
          propertyTarget[propertyName] = rewriteNames(valueStr, 'value')
        } else if (propertyType.flags & ts.TypeFlags.NumberLiteral) {
          const value = (propertyType as NumberLiteralType).value
          const valueStr = value !== 0 ? `${value}px` : '0'
          propertyTarget[propertyName] = valueStr
        } else if (propertyType.flags & ts.TypeFlags.Null) {
          propertyTarget[propertyName] = null
        } else if (propertyType.flags & ts.TypeFlags.BooleanLiteral) {
          propertyTarget[propertyName] = checker(info)!.getTrueType() === propertyType ? 'true' : 'false'
        } else if (checker(info)!.isArrayType(propertyType)) {
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
    const cssVarOrCall = getCssExpression(info, statement)
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
  info: server.PluginCreateInfo,
  statement: Statement,
): CssCall | CssVar | void {
  function getCssCall(satisfiesExpr: SatisfiesExpression): CssCall | void {
    const {expression: satisfiesLhs, type: satisfiesRhs} = satisfiesExpr
    if (!ts.isCallExpression(satisfiesLhs)) return

    const {expression: callee, arguments: args} = satisfiesLhs
    if (!ts.isIdentifier(callee) || !ts.isTypeReferenceNode(satisfiesRhs) || args.length > 1) return
    const labelType = checker(info)?.getTypeAtLocation(args[0])

    if (!((labelType?.flags ?? 0) & ts.TypeFlags.StringLiteral)) return

    const cssTypeNode = satisfiesRhs.typeArguments?.[0]
    if (!cssTypeNode || !ts.isTypeLiteralNode(cssTypeNode)) return

    if (!isLaimCssCall(info, callee)) return

    const cssType = checker(info)?.getTypeAtLocation(cssTypeNode)
    if (!cssType) return

    if (!(cssType.flags & ts.TypeFlags.Object)) return

    return {
      cssObject: cssType as ObjectType,
      label: (labelType as StringLiteralType).value,
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
