import { suite } from '../testUtil/test.mjs'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import subprocess from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'
import { type MarkupDiagnostic, parseMarkup } from './markupParser.ts'
import { type MyCodeAction, getCarets, type MyCompletionEntry, toMyCompletionEntries } from './carets.ts'
import { getComments } from './getComments.ts'

const started = performance.now()

const server= await startServer()

const cssTasks = ['basic', 'css-vars'].map(projectBasename =>
  suite(projectBasename, async suiteHandle => {
    const cssMap = parseBulkOutputCss(getOutputFile(projectBasename))

    for (const [tsRelName, tsFile] of getTsRelAndAbsNames(projectBasename)) {
      suiteHandle.test(tsRelName, async () => {
        sendOpen(tsFile)

        const actualPromise = cssMap.then(m => m.get(tsRelName))

        const cssFile = tsFile.replace('.ts', '.css')
        const expectedPromise = fs.promises.readFile(cssFile).then(buf => String(buf).trim())

        const [actual, expected] = await Promise.all([actualPromise, expectedPromise])
        assert.equal(actual, expected)
      })
    }
  })
)

const diagTasks = ['diag-local', 'diag-names', 'context-names'].map(projectBaseName =>
  suite(`${projectBaseName}_diag`, async suiteHandle => {
    for (const [tsRelName, file] of getTsRelAndAbsNames(projectBaseName)) {
      suiteHandle.test(tsRelName, async () => {
        sendOpen(file)

        const actualDiags = await getDiagnosticsAndConvertToMyDiags({file})
        const markupRegions = await Array.fromAsync(getMarkupRegions(file))
        const expectedDiags = await Array.fromAsync(toMyDiagnostics(markupRegions))

        assert.deepStrictEqual(actualDiags, expectedDiags)

        for (const {start, end, diagnostics} of markupRegions) {
          for (const markupDiag of diagnostics) {
            if (!markupDiag.skipFixes) {
              const expectedFixes = toMyFixes(start, end, markupDiag)
              const fileRange = {
                file,
                startLine: start.line + 1,
                startOffset: start.character + 1,
                endLine: end.line + 1,
                endOffset: end.character + 1,
              }
              const actualFixes = await getCodeFixesAndConvertToMyFixes({
                errorCodes: [markupDiag.code],
                ...fileRange,
              })
              assert.deepStrictEqual(actualFixes, expectedFixes)
            }
          }
        }
      })
    }
  })
)

const updateBasename = 'update'
const updateTask = suite(updateBasename, async suiteHandle => {
  const [[fileBasename, file]] = getTsRelAndAbsNames(updateBasename)

  suiteHandle.test(fileBasename, async () => {
    sendOpen(file)

    async function triggerUpdateViaHints() {
      await sendHintsAndWait({start: 0, length: 100, file})
      await delay(100) // Server writes async
    }

    const outputFile = getOutputFile(updateBasename)
    async function assertCssEqual(nameSuffix: string, withDelay: boolean = false) {
      assert.equal(
        (await parseBulkOutputCss(outputFile, withDelay)).get(path.basename(file)),
        String(await fs.promises.readFile(file.replace('.ts', `${nameSuffix}.css`))).trim()
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
})

const completionTasks = ['completion', 'context-names'].map(projectBasename =>
  suite(`${projectBasename}_completion`, async suiteHandle => {
    for (const [tsRelName, file] of getTsRelAndAbsNames(projectBasename)) {
      suiteHandle.test(tsRelName, async () => {
        sendOpen(file)

        const fileContentLines = String(await fs.promises.readFile(file)).split('\n')

        for (const caret of getCarets(fileContentLines)) {
          const expectedTestCompletionEntries = toMyCompletionEntries(caret)
          const expectedNames = expectedTestCompletionEntries.map(({name}) => name)
          
          const {caretPos} = caret
          const line1Based = caretPos.line + 1
          const offset1Based = caretPos.character + 1

          const actualCompletionEntries = await Array.fromAsync(getCompletionsAndConvertToMyEntries({file, line: line1Based, offset: offset1Based}))
          const actualCompletionNames = actualCompletionEntries.map(({name}) => name)

          const {operator} = caret
          if (operator === '(eq)')
            assert.deepStrictEqual(actualCompletionEntries, expectedTestCompletionEntries)
          else if (operator === '(first-eq)')
            assert.deepStrictEqual(actualCompletionEntries.slice(0, expectedTestCompletionEntries.length), expectedTestCompletionEntries)
          else if (operator === '(includes)')
            expectedNames.forEach(expectedName => assert.ok(
              actualCompletionNames.some(actualName => actualName.includes(expectedName)),
              `[${actualCompletionNames}] must include ${expectedName}`
            ))
          else if (operator === '(includes-not)') {
            expectedNames.forEach(unexpectedName => assert.ok(
              !actualCompletionNames.some(actualName => actualName.includes(unexpectedName)),
              `[${actualCompletionNames}] must not include ${unexpectedName}`
            ))
          }
          else
            throw new Error(`Unknown operator: ${operator} in ${file}`)

          for (const {name, hasAction} of actualCompletionEntries) {
            const details = await getCompletionEntryDetails({file, line: line1Based, offset: offset1Based, entryNames: [name]})
            const actualMyCodeActions = [...convertCompletionDetailsToMyCodeActions(file, details)]
            const expectedMyCodeActions = caret.codeActions ?? []
            assert.deepStrictEqual(actualMyCodeActions, expectedMyCodeActions)

            const actualHasActions = !!actualMyCodeActions.length || undefined
            assert.equal(actualHasActions, hasAction)
          }

          if (tsRelName === 'workaroundCompletion.ts') {
            const entryDetails = await getCompletionEntryDetails({
              file,
              line: line1Based,
              offset: offset1Based,
              entryNames: [actualCompletionNames[10]],
            })
            const documentation = entryDetails?.body?.[0]?.documentation
            assert.ok((documentation?.length ?? 0) >= 1, JSON.stringify(documentation))
          }
        }
      })

    }
  })
)

await Promise.all([...cssTasks, ...diagTasks, updateTask, ...completionTasks])

await shutdownServer()

console.log(`Total '${path.basename(import.meta.url)}' time: ${performance.now() - started}ms`)

// *** Utils ***

type Server = {
  h: ChildProcess
  nextSeq: number
  pendingSeqToResponseConsumer: Map<number, {resolve: (response: ts.server.protocol.Response) => void, reject: (error: Error) => void}>
}

async function startServer(): Promise<Server> {
  const outputFiles = fs.readdirSync(import.meta.dirname, {withFileTypes: true})
    .filter(ent => ent.isDirectory())
    .map(ent => getOutputFile(ent.name))

  const logFile = path.join(import.meta.dirname, 'tsserver-typique.log');

  [...outputFiles, logFile].forEach(f =>
    fs.rmSync(f, {force: true})
  )

  const h = subprocess.execFile(
    'node', [
      // '--inspect-brk=9779',
      path.join(import.meta.dirname, '../node_modules/typescript/lib/tsserver.js'),
      '--logVerbosity', 'verbose',
      '--logFile', logFile,
    ],
  )

  const pendingSeqToResponseConsumer = new Map()
  readline.createInterface({input: h.stdout!}).on('line', (data) => {
    if (data.startsWith('{')) {
      const response = JSON.parse(data)
      const consumer = pendingSeqToResponseConsumer.get(response.request_seq)
      if (consumer) {
        pendingSeqToResponseConsumer.delete(response.request_seq)
        consumer.resolve(response)
      }
    }
  })

  readline.createInterface({input: h.stderr!}).on('line', (data) => {
    console.error(data)
  })

  return {
    h,
    nextSeq: 0,
    pendingSeqToResponseConsumer,
  }
}

function sendOpen(file: string) {
  sendRequest({
    seq: server.nextSeq++,
    type: 'request',
    command: 'open' as ts.server.protocol.CommandTypes.Open,
    arguments: { file },
  } satisfies ts.server.protocol.OpenRequest)
}

function sendChange(args: ts.server.protocol.ChangeRequestArgs) {
  sendRequest({
    seq: server.nextSeq++,
    type: 'request',
    command: 'change' as ts.server.protocol.CommandTypes.Change,
    arguments: args,
  } satisfies ts.server.protocol.ChangeRequest)
}

function sendHintsAndWait(args: ts.server.protocol.InlayHintsRequestArgs) {
  return sendRequestAndWait({
    seq: server.nextSeq++,
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
    seq: server.nextSeq++,
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
    seq: server.nextSeq++,
    type: 'request',
    command: 'getCodeFixes' as ts.server.protocol.CommandTypes.GetCodeFixes,
    arguments: args,
  })
}

async function* getCompletionsAndConvertToMyEntries(args: ts.server.protocol.CompletionsRequestArgs): AsyncGenerator<MyCompletionEntry> {
  const completionInfo = await sendRequestAndWait<ts.server.protocol.CompletionInfoResponse>({
    seq: server.nextSeq++,
    type: 'request',
    command: 'completionInfo' as ts.server.protocol.CommandTypes.CompletionInfo,
    arguments: args,
  } satisfies ts.server.protocol.CompletionsRequest)
  const allServerEntries = completionInfo.body?.entries ?? []
  const serverEntries = allServerEntries.slice(0, 20) // To simplify test output in case of error
  for (const {name, insertText, replacementSpan, hasAction} of serverEntries) {
    yield {
      name,
      ...insertText ? { insertText } : {},
      ...replacementSpan ? {
        replacementSpan: {
          start: {
            line: replacementSpan.start.line - 1,
            character: replacementSpan.start.offset - 1
          },
          end: {
            line: replacementSpan.end.line - 1,
            character: replacementSpan.end.offset - 1
          },
        }
      } : {},
      ...hasAction ? {
        hasAction: true,
      } : {},
    } satisfies MyCompletionEntry
  }
}

function getCompletionEntryDetails(args: ts.server.protocol.CompletionDetailsRequestArgs) {
  return sendRequestAndWait<ts.server.protocol.CompletionDetailsResponse>({
    seq: server.nextSeq++,
    type: 'request',
    command: 'completionEntryDetails' as ts.server.protocol.CommandTypes.CompletionDetails,
    arguments: args,
  } satisfies ts.server.protocol.CompletionDetailsRequest)
}

function* convertCompletionDetailsToMyCodeActions(fileName: string, completionDetails: ts.server.protocol.CompletionDetailsResponse): Generator<MyCodeAction> {
  for (const body of completionDetails.body ?? []) {
    for (const codeAction of body.codeActions ?? []) {
      for (const change of codeAction.changes ?? []) {
        assert.equal(change.fileName, fileName)
        for (const {start, end, newText} of change.textChanges ?? []) {
          yield {
            start: {
              line: start.line - 1,
              character: start.offset - 1,
            },
            end: {
              line: end.line - 1,
              character: end.offset - 1,
            },
            newText,
          }
        }
      }
    }
  }
}

function sendRequestAndWait<R extends ts.server.protocol.Response>(request: ts.server.protocol.Request) {
  return new Promise<R>((resolve: any, reject: any) => {
    server.pendingSeqToResponseConsumer.set(request.seq, {resolve, reject})
    sendRequest(request)
  })
}

function sendRequest(request: ts.server.protocol.Request) {
  server.h.stdin!.write(JSON.stringify(request) + '\n')
}

async function shutdownServer() {
  sendRequest({
    seq: server.nextSeq++,
    type: 'request',
    command: 'exit' as ts.server.protocol.CommandTypes.Exit,
  })

  while (server.h.exitCode == null) {
    await delay(50)
  }

  server.pendingSeqToResponseConsumer.values().forEach(r => r.reject(new Error('tsserver exited')))

  if (server.h.exitCode !== 0)
    throw new Error(`tsserver exited with code ${server.h.exitCode}`)
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

type RelAndAbsName = [
  relName: string, // Relative to project dir
  absName: string,
]

function getTsRelAndAbsNames(projectBasename: string): RelAndAbsName[] {
  const relNames = [...getTsRelNames(path.join(import.meta.dirname, projectBasename))]
  assert(relNames.length, `No TS files in ${projectBasename}`)
  return relNames.map(relName => ([
    relName,
    path.join(import.meta.dirname, projectBasename, relName),
  ] satisfies RelAndAbsName))
}

function* getTsRelNames(dir: string): IterableIterator<string> {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const {name} = entry
    if (entry.isFile() && /^[a-zA-Z0-9]\w+\.tsx?$/.test(name))
      yield name
    else if (entry.isDirectory()) {
      for (const subdirRelName of getTsRelNames(path.join(dir, name))) {
        yield path.join(name, subdirRelName)
      }
    }
  }
}

function getOutputFile(projectBasename: string) {
  return path.join(import.meta.dirname, projectBasename, 'typique-output.css')
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

async function* toMyDiagnostics(regions: MarkupRegion[]): AsyncGenerator<MyDiagnostic> {
  for (const region of regions) {
    const {tsFile, start, end, diagnostics} = region
    for (const diagnostic of diagnostics) {
      yield {
        code: diagnostic.code,
        messageText: diagnostic.messageText,
        start,
        end,
        related: await Promise.all(diagnostic.related.map(async related => {
          const targetFile = related.file
            ? path.join(path.dirname(tsFile), related.file)
            : tsFile
          const targetRegions = targetFile === tsFile
            ? regions
            : await Array.fromAsync(getMarkupRegions(targetFile))
          const {line, character} = (
            related.regionIndex == null
              ? region
              : targetRegions[related.regionIndex]
          ).start
          return {
            code: related.code,
            messageText: related.messageText,
            file: path.relative(path.dirname(tsFile), targetFile),
            position: {
              line,
              character,
            },
          }
        }))
      }
    }
  }
}

function toMyFixes(start: ts.LineAndCharacter, end: ts.LineAndCharacter, diagnostic: MarkupDiagnostic): MyFix[] {
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

type MarkupRegion = {
  tsFile: string,
  start: ts.LineAndCharacter
  end: ts.LineAndCharacter
  diagnostics: MarkupDiagnostic[]
}

async function* getMarkupRegions(tsFile: string): AsyncGenerator<MarkupRegion> {
  const lines = String(await fs.promises.readFile(tsFile, {encoding: 'utf-8'})).split('\n')

  let startMarkerEnd: ts.LineAndCharacter | undefined = undefined
  for await (const {start, end, innerText} of getComments(lines)) {
    if (innerText.startsWith('~~')) {
      const markup  = innerText.slice(2)
      if (!startMarkerEnd) {
        assert(!markup, `Opening marker must not contain markup but found '${innerText}' on line '${start.line}' in ${tsFile}`)
        startMarkerEnd = end
      } else {
        assert(startMarkerEnd.line === start.line, `Opening marker must be on the same line as closing marker but found '${innerText}' on line '${start.line}' in ${tsFile}`)
        const {line} = start
        const name = lines[line].substring(startMarkerEnd.character + 1, start.character - 1) // in quotes
        yield {
          tsFile,
          start: {
            line,
            character: startMarkerEnd.character,
          },
          end: {
            line,
            character: start.character,
          },
          diagnostics: [...parseMarkup(name, markup!)],
        }

        startMarkerEnd = undefined
      }
    }
  }
}
