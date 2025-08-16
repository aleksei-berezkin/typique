import { test } from 'uvu'
import assert from 'node:assert'
import fs, { readFileSync } from 'node:fs'
import path from 'node:path'
import subprocess from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'

const started = performance.now()

const projectNameFilter = (name: string) => name.includes(process.argv[2] ?? '')
const fileNameFilter = (name: string) => name.includes(process.argv[3] ?? '')

const outputBasename = 'laim-output.css'

let h: ChildProcess
let nextSeq = 0
await startServer()

for (const projectBasename of getTestOutputProjectBasenames()) {
  function getFileName(relName: string) {
    return path.join(import.meta.dirname, projectBasename, relName)
  }

  const cssMap = parseBulkOutputCss(projectBasename)

  getCssRelNames(projectBasename).forEach((cssFileRelName, testIndex) => {
    const tsFile = getFileName(cssFileRelName.replace('.css', '.ts'))
    sendOpen(tsFile)
    
    test(`${projectBasename}/${cssFileRelName}`, async () => {
      if (testIndex === 0)
        console.log(`\nTesting ${projectBasename} (css output)...`)

      const actual = (await cssMap).get(cssFileRelName.replace('.css', '.ts'))
      const expected = String(readFileSync(getFileName(cssFileRelName))).trim()
      assert.equal(actual, expected)
    })

    test(`${projectBasename}/${cssFileRelName} (highlighted fragments)`, async () => {
      const diagnostics = await getDiagnostics({file: tsFile})
      const actualFragments: HighlightedFragment[] = ((diagnostics.body ?? []) as ts.server.protocol.Diagnostic[])
        ?.map(d => ({
          start: {
            line: d.start.line - 1,
            character: d.start.offset - 1,
          },
          end: {
            line: d.end.line - 1,
            character: d.end.offset - 1,
          },
          links: d.relatedInformation?.map(r =>
            `${path.relative(path.dirname(tsFile), r.span?.file ?? '')}:${r.span?.start?.line}:${r.span?.start?.offset}`
          ) ?? [],
        }))
      assert.deepEqual(actualFragments, getExpectedHighlightedFragments(tsFile))
    })
  })

  test(`${projectBasename} (names in output CSS)`, async () => {
    assert.deepEqual(
      new Set((await cssMap).keys().filter(fileNameFilter)),
      new Set(getTsRelNames(projectBasename)),
    )
  })
}

const [updateProjectBasename, updateFileRelName] = getProjectAndFileNameIfPassesFilters('update', 'simpleUpdate.ts')
if (updateProjectBasename && updateFileRelName) {
  test(`${updateProjectBasename}/${updateFileRelName} (change)`, async () => {
    console.log(`\nTesting update (change)...`)

    const output = getOutputFile(updateProjectBasename)
    const mtime = fs.statSync(output).mtimeMs
    const file = path.join(import.meta.dirname, updateProjectBasename, updateFileRelName)
    sendChange({line: 8, offset: 1, endLine: 8, endOffset: 1, insertString: 'const foo = 42\n', file})

    async function triggerUpdateViaHints() {
      await sendHintsAndWait({start: 0, length: 100, file})
      await delay(100) // Server writes async
    }
    await triggerUpdateViaHints()
    const mtime2 = fs.statSync(output).mtimeMs
    assert.equal(mtime2, mtime)

    sendChange({line: 9, offset: 1, endLine: 9, endOffset: 1, insertString: 'const n = "new" satisfies Css<{color: "pink"}>\n', file})
    await triggerUpdateViaHints()
    const mtime3 = fs.statSync(output).mtimeMs
    assert(mtime3 > mtime);

    assert.equal(
      (await parseBulkOutputCss(updateProjectBasename, false)).get(updateFileRelName),
      String(readFileSync(path.join(import.meta.dirname, updateProjectBasename, updateFileRelName.replace('.ts', '.1.css')))).trim()
    )
  })
}

const [completionProjectBasename, simpleCompletionFile] = getProjectAndFileNameIfPassesFilters('completion', 'simpleCompletion.ts')
if (completionProjectBasename && simpleCompletionFile) {
  test(`${completionProjectBasename}/${simpleCompletionFile} (completion)`, async () => {
    console.log(`\nTesting completions()...`)
    const file = path.join(import.meta.dirname, completionProjectBasename, simpleCompletionFile)
    sendOpen(file)
    const completionInfo = await getCompletions({
      file,
      line: 3,
      offset: 23,
    })
    assert.deepEqual(
      completionInfo.body?.entries.map(e => e.name),
      ['user-pic-2', 'pic-0'],
    )
  })
}

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
  const logFile = path.join(import.meta.dirname, 'tsserver-laim.log');

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

function getDiagnostics(args: ts.server.protocol.SemanticDiagnosticsSyncRequestArgs) {
  return sendRequestAndWait<ts.server.protocol.SemanticDiagnosticsSyncResponse>({
    seq: nextSeq++,
    type: 'request',
    command: 'semanticDiagnosticsSync' as ts.server.protocol.CommandTypes.SemanticDiagnosticsSync,
    arguments: args,
  } satisfies ts.server.protocol.SemanticDiagnosticsSyncRequest)
}

function getCompletions(args: ts.server.protocol.CompletionsRequestArgs) {
  return sendRequestAndWait<ts.server.protocol.CompletionInfoResponse>({
    seq: nextSeq++,
    type: 'request',
    command: 'completionInfo' as ts.server.protocol.CommandTypes.CompletionInfo,
    arguments: args,
  } satisfies ts.server.protocol.CompletionsRequest)
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

function getTestOutputProjectBasenames(): string[] {
  return getProjectBasenames().filter(b => b !== 'completion')
}

function getProjectBasenames(): string[] {
  const projectBasenames = fs.readdirSync(import.meta.dirname, {withFileTypes: true})
    .filter(ent => ent.isDirectory())
    .map(ent => ent.name)
    .filter(projectNameFilter)
  assert(projectBasenames.length, 'No project directories')
  return projectBasenames
}

function getCssRelNames(relDir: string): string[] {
  const dirName = path.join(import.meta.dirname, relDir)
  const cssBasenames = fs.readdirSync(dirName)
    .filter(f => f.endsWith('.css') && !f.endsWith('.1.css') && f !== outputBasename)
    .filter(fileNameFilter)
  assert(cssBasenames.length, `No css files for ${relDir}`)

  const subdirsBasenames = fs.readdirSync(dirName, {withFileTypes: true})
    .filter(ent => ent.isDirectory())
  const cssNamesInSubdirs = subdirsBasenames
    .flatMap(d => getCssRelNames(path.join(relDir, d.name)).map(cssF => path.join(d.name, cssF)))

  return [...cssBasenames, ...cssNamesInSubdirs]
}

function getTsRelNames(projectBasename: string) {
  return getCssRelNames(projectBasename).map(f => f.replace('.css', '.ts'))
}

function getProjectAndFileNameIfPassesFilters(projectBasename: string, fileRelName: string): [string, string] | [undefined, undefined] {
  return projectNameFilter(projectBasename) && fileNameFilter(fileRelName)
    ? [projectBasename, fileRelName]
    : [undefined, undefined]
}


function getOutputFile(projectBasename: string) {
  return path.join(import.meta.dirname, projectBasename, outputBasename)
}

async function parseBulkOutputCss(projectBasename: string, withDelay = true) {
  const outputFile = getOutputFile(projectBasename)
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

type HighlightedFragment = {
  // All zero-based
  start: ts.LineAndCharacter
  end: ts.LineAndCharacter
  links: string[]
}

function getExpectedHighlightedFragments(tsFile: string): HighlightedFragment[] {
  const highlightMarker = '/*~~*/'
  const linksMarker = '// ~~>'
  return String(fs.readFileSync(tsFile))
    .split('\n')
    .flatMap((l, i) => {
      const startPos = l.indexOf(highlightMarker)
      if (startPos === -1) return []
      const endPos = l.indexOf(highlightMarker, startPos + highlightMarker.length)
      if (endPos === -1) throw new Error(`Only one highlight marker on line '${i}' in ${tsFile}`)
      const linksStart = l.indexOf(linksMarker)
      if (linksStart === -1) throw new Error(`No links marker on line '${i}' in ${tsFile}`)
      const links = l.slice(linksStart + linksMarker.length).split(',').map(l => l.trim())
      return [
        {
          start: {
            line: i,
            character: startPos + highlightMarker.length,
          },
          end: {
            line: i,
            character: endPos
          },
          links,
        }
      ]
    })
}
