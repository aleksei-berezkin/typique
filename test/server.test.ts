import { test } from 'uvu'
import assert from 'node:assert'
import fs, { readFileSync } from 'node:fs'
import path from 'node:path'
import subprocess from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'
import { errorCodeAndMsg } from '../ts-plugin/messages.js'
import { type MarkupDiagnostic, parseMarkup } from './markupParser.ts'

const started = performance.now()

const projectNameFilter = (name: string) => name.includes(process.argv[2] ?? '')
const fileNameFilter = (name: string) => name.includes(process.argv[3] ?? '')

const outputBasename = 'typique-output.css'

let h: ChildProcess
let nextSeq = 0
await startServer()

for (const projectBasename of getProjectBasenames(['basic', 'css-vars'])) {
  function getFileName(relName: string) {
    return path.join(import.meta.dirname, projectBasename, relName)
  }

  const cssRelNames = getCssRelNames(projectBasename)
  const cssMap = parseBulkOutputCss(getOutputFile(projectBasename))

  cssRelNames.forEach((cssFileRelName, testIndex) => {
    const tsFile = getFileName(cssFileRelName.replace('.css', '.ts'))
    sendOpen(tsFile)
    
    test(`${projectBasename}/${cssFileRelName}`, async () => {
      if (testIndex === 0)
        // + 1 for name test below
        console.log(`\nTesting ${projectBasename} (css output) totally ${cssRelNames.length + 1} tests...`)

      const actual = (await cssMap).get(cssFileRelName.replace('.css', '.ts'))
      const expected = String(readFileSync(getFileName(cssFileRelName))).trim()
      assert.equal(actual, expected)
    })
  })

  test(`${projectBasename} (names in output CSS)`, async () => {
    const tsRelNames = cssRelNames.map(f => f.replace('.css', '.ts'))
    assert.deepEqual(
      new Set((await cssMap).keys().filter(fileNameFilter)),
      new Set(tsRelNames),
    )
  })
}

for (const projectBaseName of getProjectBasenames(['diag-local', 'diag-classnames'])) {
  testTsFiles(projectBaseName, async file => {
    sendOpen(file)
    const actualDiags = await getDiagnosticsAndConvertToMyDiags({file})
    const markupDiags = [...getMarkupDiagnostics(file)]
    const expectedDiags = toMyDiagnostics(markupDiags)

    assert.deepEqual(actualDiags, expectedDiags)

    for (const markupDiag of markupDiags) {
      const expectedFixes = toMyFixes(markupDiag)
      const fileRange = {
        file,
        startLine: markupDiag.start.line + 1,
        startOffset: markupDiag.start.character + 1,
        endLine: markupDiag.end.line + 1,
        endOffset: markupDiag.end.character + 1,
      }
      const actualFixes = await getCodeFixesAndConvertToMyFixes({
        errorCodes: [markupDiag.diagnostic.code],
        ...fileRange,
      })
      assert.deepEqual(actualFixes, expectedFixes)
    }
  })
}

testFile('update', 'simpleUpdate.ts', async file => {
  sendOpen(file)

  async function triggerUpdateViaHints() {
    await sendHintsAndWait({start: 0, length: 100, file})
    await delay(100) // Server writes async
  }

  const outputFile = getOutputFile(path.basename(path.dirname(file)))
  async function assertCssEqual(nameSuffix: string, withDelay: boolean = false) {
    assert.equal(
      (await parseBulkOutputCss(outputFile, withDelay)).get(path.basename(file)),
      String(readFileSync(file.replace('.ts', `${nameSuffix}.css`))).trim()
    )
  }
  await assertCssEqual('.0', true)

  const mtime = fs.statSync(outputFile).mtimeMs
  sendChange({line: 8, offset: 1, endLine: 8, endOffset: 1, insertString: 'const foo = 42\n', file})

  await triggerUpdateViaHints()
  const mtime2 = fs.statSync(outputFile).mtimeMs
  assert.equal(mtime2, mtime)
  await assertCssEqual('.0')

  sendChange({line: 9, offset: 1, endLine: 9, endOffset: 1, insertString: 'const n = "new" satisfies Css<{color: "pink"}>\n', file})
  await triggerUpdateViaHints()
  const mtime3 = fs.statSync(outputFile).mtimeMs
  assert(mtime3 > mtime);
  await assertCssEqual('.1')
})

testFile('completion', 'simpleCompletion.ts', async file => {
  sendOpen(file)
  const [{line, offset}] = getCaretPositions(file)
  assert.deepEqual(
    await getCompletionNames({file, line, offset}),
    ['user-pic-2', 'pic-0'],
  )
})

testFile('completion', 'multipleNamesCompletion.ts', async file => {
  sendOpen(file)
  const carets = getCaretPositions(file)
  assert.deepEqual(
    await getCompletionNames({file, ...carets[0]}),
    ['root-0'],
  )
  assert.deepEqual(
    await getCompletionNames({file, ...carets[1]}),
    ['large'],
  )
  assert.deepEqual(
    await getCompletionNames({file, ...carets[2]}),
    ['small-1'],
  )
})

testFile('completion', 'inSatisfiesExpression.ts', async file => {
  sendOpen(file)
  const carets = getCaretPositions(file)
  assert.deepEqual(
    await getCompletionNames({file, ...carets[0]}),
    ['my-button', 'button-0'],
  )
  assert.deepEqual(
    await getCompletionNames({file, ...carets[1]}),
    ['button-0'],
  )
  assert.deepEqual(
    await getCompletionNames({file, ...carets[2]}),
    ['header'],
  )
})

testFile('completion', 'multipleNamesFull.ts', async file => {
  sendOpen(file)
  const carets = getCaretPositions(file)
  assert.deepEqual(
    await getCompletionNames({file, ...carets[0]}),
    ["bt-2', 'lg-2', 'sm-2", 'bt-0'],
  )
  assert.deepEqual(
    await getCompletionNames({file, ...carets[1]}),
    ['bt-1", "lg-1', 'bt-0'],
  )
  assert.deepEqual(
    await getCompletionNames({file, ...carets[2]}),
    ['bt-0`, `sm-0', 'bt-0'],
  )
})

testFile('completion', 'wrongPos.ts', async file => {
  sendOpen(file)
  const [caret] = getCaretPositions(file)
  const completionNames = await getCompletionNames({file, ...caret})!
  const myName = completionNames?.find(name => name.includes('my-button'))
  assert(!myName, `${myName} must not be in completion names`)  
})

test.after(async () => {
  await shutdownServer(h)
  setTimeout(() => {
    // To write after uvu
    console.log(`Total '${path.basename(import.meta.url)}' time: ${performance.now() - started}ms`)
  })
})

test.run()

// *** Utils ***

async function startServer() {
  const outputFiles = getProjectBasenames().map( getOutputFile)
  const logFile = path.join(import.meta.dirname, 'tsserver-typique.log');

  [...outputFiles, logFile].forEach(f =>
    fs.rmSync(f, {force: true})
  )

  h = subprocess.execFile(
    'node', [
      // '--inspect-brk=9229',
      path.join(import.meta.dirname, '../node_modules/typescript/lib/tsserver.js'),
      '--logVerbosity', 'verbose',
      '--logFile', logFile,
    ],
  )
  readline.createInterface({input: h.stdout!}).on('line', (data) => {
    // console.info(data)
  })
  readline.createInterface({input: h.stderr!}).on('line', (data) => {
    console.error(data)
  })

  return h
}

function sendOpen(file: string) {
  sendRequest({
    seq: nextSeq++,
    type: 'request',
    command: 'open' as ts.server.protocol.CommandTypes.Open,
    arguments: {
      file,
      scriptKindName: 'TS',
    },
  } satisfies ts.server.protocol.OpenRequest)
}

function sendChange(args: ts.server.protocol.ChangeRequestArgs) {
  sendRequest({
    seq: nextSeq++,
    type: 'request',
    command: 'change' as ts.server.protocol.CommandTypes.Change,
    arguments: args,
  } satisfies ts.server.protocol.ChangeRequest)
}

function sendHintsAndWait(args: ts.server.protocol.InlayHintsRequestArgs) {
  return sendRequestAndWait({
    seq: nextSeq++,
    type: 'request',
    command: 'provideInlayHints' as ts.server.protocol.CommandTypes.ProvideInlayHints,
    arguments: args,
  } satisfies ts.server.protocol.InlayHintsRequest)
}

async function getDiagnosticsAndConvertToMyDiags(args: ts.server.protocol.SemanticDiagnosticsSyncRequestArgs): Promise<MyDiagnostic[]> {
  return (((await getDiagnostics(args)).body ?? []) as ts.server.protocol.Diagnostic[])
    ?.map(d => ({
      code: d.code ?? -1,
      messageText: d.text,
      start: {
        line: d.start.line - 1,
        character: d.start.offset - 1,
      },
      end: {
        line: d.end.line - 1,
        character: d.end.offset - 1,
      },
      related: d.relatedInformation?.map(r => ({
        code: r.code ?? -1,
        messageText: r.message,
        file: path.relative(path.dirname(args.file), r.span?.file ?? ''),
        position: {
          line: (r.span?.start.line ?? 0) - 1,
          character: (r.span?.start?.offset ?? 0) - 1,
        }
      })) ?? [],
    }))
    .sort((a, b) => a.start.line - b.start.line || a.start.character - b.start.character)
}

function getDiagnostics(args: ts.server.protocol.SemanticDiagnosticsSyncRequestArgs) {
  return sendRequestAndWait<ts.server.protocol.SemanticDiagnosticsSyncResponse>({
    seq: nextSeq++,
    type: 'request',
    command: 'semanticDiagnosticsSync' as ts.server.protocol.CommandTypes.SemanticDiagnosticsSync,
    arguments: args,
  } satisfies ts.server.protocol.SemanticDiagnosticsSyncRequest)
}

async function getCodeFixesAndConvertToMyFixes(args: ts.server.protocol.CodeFixRequestArgs): Promise<MyFix[]> {
  return ((await getCodeFixes(args)).body ?? [])
    // So far: only one change, only one edit
    ?.flatMap(({description, changes: [{textChanges: [edit]}]}) => ({
      start: {
        line: edit.start.line - 1,
        character: edit.start.offset - 1,
      },
      end: {
        line: edit.end.line - 1,
        character: edit.end.offset - 1,
      },
      newText: edit.newText,
      description,
    }))
}

function getCodeFixes(args: ts.server.protocol.CodeFixRequestArgs) {
  return sendRequestAndWait<ts.server.protocol.CodeFixResponse>({
    seq: nextSeq++,
    type: 'request',
    command: 'getCodeFixes' as ts.server.protocol.CommandTypes.GetCodeFixes,
    arguments: args,
  })
}

async function getCompletionNames(args: ts.server.protocol.CompletionsRequestArgs) {
  const completionInfo = await sendRequestAndWait<ts.server.protocol.CompletionInfoResponse>({
    seq: nextSeq++,
    type: 'request',
    command: 'completionInfo' as ts.server.protocol.CommandTypes.CompletionInfo,
    arguments: args,
  } satisfies ts.server.protocol.CompletionsRequest)
  const allNames = completionInfo.body?.entries?.map(e => e.name) ?? []
  return allNames.slice(0, 10) // To simplify test output in case of error
}

function sendRequestAndWait<R extends ts.server.protocol.Response>(request: ts.server.protocol.Request) {
  return new Promise<R>(resolve => {
    const emitter = readline.createInterface({ input: h.stdout! })
    emitter.on('line', (data) => {
      if (data.startsWith('{')) {
        const response = JSON.parse(data) as R
        if (response.request_seq === request.seq) {
          resolve(response)
          emitter.close()
        }
      }
    })
    sendRequest(request)
  })
}

function sendRequest(request: ts.server.protocol.Request) {
  h.stdin!.write(JSON.stringify(request) + '\n')
}

async function shutdownServer(h: ChildProcess) {
  const exitRequest: ts.server.protocol.ExitRequest = {
    seq: 1,
    type: 'request',
    command: 'exit' as ts.server.protocol.CommandTypes.Exit,
  }
  h.stdin!.write(JSON.stringify(exitRequest) + '\n')
  while (h.exitCode == null) {
    await delay(50)
  }
  if (h.exitCode !== 0)
    throw new Error(`tsserver exited with code ${h.exitCode}`)
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getProjectBasenames(onlyInclude?: string[]): string[] {
  const projectBasenames = fs.readdirSync(import.meta.dirname, {withFileTypes: true})
    .filter(ent => ent.isDirectory())
    .map(ent => ent.name)
    .filter(p => !onlyInclude || onlyInclude.includes(p))
  assert(projectBasenames.length, 'No project directories')

  return projectBasenames.filter(projectNameFilter)
}

function getCssRelNames(projectBasename: string): string[] {
  const cssRelNames = getRelNames(path.join(import.meta.dirname, projectBasename), '.css')
  assert(cssRelNames.length, `No CSS files for ${projectBasename}`)
  return cssRelNames
}

function getTsRelNames(projectBasename: string) {
  const tsRelNames = getRelNames(path.join(import.meta.dirname, projectBasename), '.ts')
  assert(tsRelNames.length, `No TS files for ${projectBasename}`)
  return tsRelNames
}

function getRelNames(dir: string, ext: '.css' | '.ts'): string[] {
  const basenames = fs.readdirSync(dir)
    .filter(f => f.endsWith(ext) && f !== outputBasename)
    .filter(fileNameFilter)

  const subdirsBasenames = fs.readdirSync(dir, {withFileTypes: true})
    .filter(ent => ent.isDirectory())
  const cssNamesInSubdirs = subdirsBasenames
    .flatMap(d => getRelNames(path.join(dir, d.name), ext).map(cssF => path.join(d.name, cssF)))

  return [...basenames, ...cssNamesInSubdirs]
}

function testTsFiles(projectBasename: string, cb: (file: string) => Promise<void> | void) {
  if (!getProjectBasenames([projectBasename]).length) return
  const tsRelNames = getTsRelNames(projectBasename)
  tsRelNames.forEach((tsRelName, i) => {
    test(`${projectBasename}/${tsRelName}`, async () => {
      if (i === 0)
        console.log(`\nTesting ${projectBasename}/*.ts, totally ${tsRelNames.length} tests...`)
      await cb(path.join(import.meta.dirname, projectBasename, tsRelName))
    })
  })
}

function testFile(projectBasename: string, fileRelName: string, cb: (file: string) => Promise<void> | void) {
  const projectFileName = path.join(import.meta.dirname, projectBasename)
  if (!fs.existsSync(projectFileName))
    throw new Error(`${projectFileName} is not found`)
  const fileName = path.join(projectFileName, fileRelName)
  if (!fs.existsSync(fileName))
    throw new Error(`${fileName} is not found`)
  if (projectNameFilter(projectBasename) && fileNameFilter(fileRelName))
    test(`${projectBasename}/${fileRelName}`, async () => {
      console.log(`\nTesting ${projectBasename}/${fileRelName}...`)
      await cb(fileName)
    })
}

function getOutputFile(projectBasename: string) {
  return path.join(import.meta.dirname, projectBasename, outputBasename)
}

async function parseBulkOutputCss(outputFile: string, withDelay = true) {
  if (withDelay) await awaitFile(outputFile)
  const fileBasenameToCss = new Map<string, string>()
  let currentTsFile: string | undefined = undefined
  for (const l of String(fs.readFileSync(outputFile)).split('\n')) {
    const m = /^\/\* (src|end): ([\w/.-]+) \*\/$/.exec(l)
    if (m) {
      if (currentTsFile) {
        if (m[1] !== 'end')
          throw new Error(`Expected 'end' but got '${l}'`)
        currentTsFile = undefined
      } else {
        if (m[1] !== 'src')
          throw new Error(`Expected 'src' but got '${l}'`)
        currentTsFile = m[2]
      }
    } else {
      if (currentTsFile) {
        const content = fileBasenameToCss.get(currentTsFile)
        fileBasenameToCss.set(currentTsFile, content ? `${content}\n${l}` : l)
      } else if (l) {
        throw new Error(`Expected 'src' or 'end' but got '${l}'`)
      }
    }
  }
  return fileBasenameToCss
}

async function awaitFile(file: string) {
  while (!fs.existsSync(file)) {
    await delay(200)
  }
  await delay(50)
}

type MyDiagnostic = {
  code: number
  messageText: string
  // 0-based
  start: ts.LineAndCharacter
  end: ts.LineAndCharacter
  related: MyRelated[]
}

type MyRelated = {
  code: number
  messageText: string
  file: string
  position: ts.LineAndCharacter
}

type MyFix = {
  // 0-based
  start: ts.LineAndCharacter
  end: ts.LineAndCharacter
  newText: string
  description: string
}

function toMyDiagnostics(diagnostics: PositionedMarkupDiagnostic[]): MyDiagnostic[] {
  return diagnostics.map(({tsFile, diagnostic, start, end}) => ({
    code: diagnostic.code,
    messageText: diagnostic.messageText,
    start: start,
    end: end,
    related: diagnostic.related.map(related => {
      const targetFile = related.file
        ? path.join(path.dirname(tsFile), related.file)
        : tsFile
      const targetDiagnostics = targetFile === tsFile
        ? diagnostics
        : [...getMarkupDiagnostics(targetFile)]
      assert(related.diagnosticIndex < targetDiagnostics.length, `Cannot find target diagnostic file: '${related.file}', index: ${related.diagnosticIndex}`)
      const {line, character} = targetDiagnostics[related.diagnosticIndex].start
      return {
        code: related.code,
        messageText: related.messageText,
        file: path.relative(path.dirname(tsFile), targetFile),
        position: {
          line,
          character,
        },
      }
    }),
  }))
}

function toMyFixes({diagnostic, start, end}: PositionedMarkupDiagnostic): MyFix[] {
  return diagnostic.fixes.map(fix => ({
    start: {
      line: start.line,
      character: start.character + 1, // in quotes
    },
    end: {
      line: end.line,
      character: end.character - 1,
    },
    newText: fix.newText,
    description: fix.description,
  }))
}

type PositionedMarkupDiagnostic = {
  tsFile: string,
  start: ts.LineAndCharacter
  end: ts.LineAndCharacter
  diagnostic: MarkupDiagnostic
}

function* getMarkupDiagnostics(tsFile: string): IterableIterator<PositionedMarkupDiagnostic> {
  const lines = String(fs.readFileSync(tsFile)).split('\n')
  let startMarkerEndPos = -1
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\/\*~~(?<markup>([^*]|\*(?!\/))*)\*\//g)) {
      const markup = m.groups?.markup
      if (startMarkerEndPos === -1) {
        assert(!markup, `Opening marker must not contain markup but found '${m[0]}' on line '${i + 1}' in ${tsFile}`)
        startMarkerEndPos = m.index + m[0].length
      } else {
        const className = lines[i].substring(startMarkerEndPos + 1, m.index - 1) // in quotes
        yield* [...parseMarkup(className, markup!)].map(diagnostic => ({
          tsFile,
          start: {
            line: i,
            character: startMarkerEndPos,
          },
          end: {
            line: i,
            character: m.index,
          },
          diagnostic
        }))
        startMarkerEndPos = -1
      }
    }
  }
}

/**
 * One-based, like FileLocationRequestArgs
 */
function getCaretPositions(tsFile: string): {line: number, offset: number}[] {
  return String(fs.readFileSync(tsFile))
    .split('\n')
    .flatMap((l, i) => [
      ...l.matchAll(/\/\*(?<l>(?<lo>\d+)?<\|)|(?<r>\|>(?<ro>\d+)?)\*\//g)
        .map(m => {
          if (m.groups?.l) {
            return {
              line: i + 1,
              offset: m.index - Number(m.groups?.lo ?? 0) + 1,
            }
          }
          if (m.groups?.r) {
            return {
              line: i + 1,
              offset: m.index + m[0].length + Number(m.groups?.ro ?? 0) + 1,
            }
          }
          assert(false, `Unexpected marker '${m[0]}'`)
        })
    ])
}
