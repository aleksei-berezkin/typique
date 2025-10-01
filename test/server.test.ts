import { suite } from '../testUtil/test.mjs'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import subprocess from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'
import { type MarkupDiagnostic, parseMarkup } from './markupParser.ts'
import { getCarets } from './carets.ts'

const started = performance.now()

const outputBasename = 'typique-output.css'

let nextSeq = 0
const pendingSeqToResponseConsumer = new Map<number, (response: ts.server.protocol.Response) => void>()
const h= await startServer()

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

const diagTasks = ['diag-local', 'diag-classnames'].map(projectBaseName =>
  suite(projectBaseName, async suiteHandle => {
    for (const [tsRelName, file] of getTsRelAndAbsNames(projectBaseName)) {
      suiteHandle.test(tsRelName, async () => {
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

    const outputFile = getOutputFile(path.basename(path.dirname(file)))
    async function assertCssEqual(nameSuffix: string, withDelay: boolean = false) {
      assert.equal(
        (await parseBulkOutputCss(outputFile, withDelay)).get(path.basename(file)),
        String(fs.readFileSync(file.replace('.ts', `${nameSuffix}.css`))).trim()
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

const completionBasename = 'completion'
const completionTask = suite(completionBasename, async suiteHandle => {
  for (const [tsRelName, file] of getTsRelAndAbsNames(completionBasename)) {
    suiteHandle.test(tsRelName, async () => {
      sendOpen(file)

      const fileContent = String(await fs.promises.readFile(file))

      for (const {line, pos, completionItems, operator} of getCarets(fileContent)) {
        const actualCompletionNames = await getCompletionNames({file, line: line + 1, offset: pos + 1})

        if (operator === '(eq)')
          assert.deepEqual(actualCompletionNames, completionItems)
        else if (operator === '(includes)')
          completionItems.forEach(name => assert.ok(
            actualCompletionNames.includes(name),
            `[${actualCompletionNames}] must include ${name}`
          ))
        else if (operator === '(includes_not)') {
          completionItems.forEach(name => assert.ok(
            !actualCompletionNames.includes(name),
            `[${actualCompletionNames}] must not include ${name}`
          ))
        }
        else
          throw new Error(`Unknown operator: ${operator} in ${file}`)
      }
    })
  }
})

await Promise.all([...cssTasks, ...diagTasks, updateTask, completionTask])

await shutdownServer(h)
console.log(`Total '${path.basename(import.meta.url)}' time: ${performance.now() - started}ms`)

// *** Utils ***

async function startServer() {
  const outputFiles = fs.readdirSync(import.meta.dirname, {withFileTypes: true})
    .filter(ent => ent.isDirectory())
    .map(ent => getOutputFile(ent.name))

  const logFile = path.join(import.meta.dirname, 'tsserver-typique.log');

  [...outputFiles, logFile].forEach(f =>
    fs.rmSync(f, {force: true})
  )

  const h = subprocess.execFile(
    'node', [
      // '--inspect-brk=9229',
      path.join(import.meta.dirname, '../node_modules/typescript/lib/tsserver.js'),
      '--logVerbosity', 'verbose',
      '--logFile', logFile,
    ],
  )

  readline.createInterface({input: h.stdout!}).on('line', (data) => {
    if (data.startsWith('{')) {
      const response = JSON.parse(data)
      const consumer = pendingSeqToResponseConsumer.get(response.request_seq)
      if (consumer) {
        pendingSeqToResponseConsumer.delete(response.request_seq)
        consumer(response)
      }
    }
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
    pendingSeqToResponseConsumer.set(request.seq, resolve as any)
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

type RelAndAbsName = [
  relName: string, // Relative to project dir
  absName: string
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
    if (entry.isFile() && /^[a-zA-Z0-9]\w+\.ts$/.test(name))
      yield name
    else if (entry.isDirectory()) {
      for (const subdirRelName of getTsRelNames(path.join(dir, name))) {
        yield path.join(name, subdirRelName)
      }
    }
  }
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
