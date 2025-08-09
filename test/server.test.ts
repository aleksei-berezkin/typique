import { test } from 'uvu'
import assert from 'node:assert'
import fs, { readFileSync } from 'node:fs'
import path from 'node:path'
import subprocess from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'

const started = performance.now()

const outputBasename = 'laim-output.css'

const h = await startServer()

for (const projectBasename of getProjectBasenames()) {
  const fileBasenameToCss = await parseBulkOutputCss(projectBasename)

  test(`${projectBasename} names`, () => {
    console.log(`\nTesting ${projectBasename}...`)
    assert.deepEqual(
      new Set(fileBasenameToCss.keys()),
      new Set(getTsBasenames(projectBasename)),
    )
  })

  for (const cssFileBasename of getCssBasenames(projectBasename)) {
    test(`${projectBasename}/${cssFileBasename}`, () => {
      const actual = fileBasenameToCss.get(cssFileBasename.replace('.css', '.ts'))
      const expected = String(readFileSync(path.join(import.meta.dirname, projectBasename, cssFileBasename))).trim()
      assert.equal(actual, expected)
    })
  }
}

test('update css', async () => {
  console.log(`\nTesting update css...`)

  const updateBasename = 'update'
  const output = getOutputFile(updateBasename)
  const mtime = fs.statSync(output).mtimeMs
  const tsBasename = getTsBasenames(updateBasename)[0]
  const file = path.join(import.meta.dirname, updateBasename, tsBasename)
  sendRequest(h, {
    seq: 1,
    type: 'request',
    command: 'change' as ts.server.protocol.CommandTypes.Change,
    arguments: { line: 8, offset: 1, endLine: 8, endOffset: 1, insertString: 'const foo = 42\n', file },
  } satisfies ts.server.protocol.ChangeRequest)

  async function triggerUpdateViaHints() {
    await sendRequestAndWait(h, {
      seq: 10,
      type: 'request',
      command: 'provideInlayHints' as ts.server.protocol.CommandTypes.ProvideInlayHints,
      arguments: { start: 0, length: 100, file }
    } satisfies ts.server.protocol.InlayHintsRequest)
    await delay(100) // Server writes async
  }
  await triggerUpdateViaHints()
  const mtime2 = fs.statSync(output).mtimeMs
  assert.equal(mtime2, mtime)

  sendRequest(h, {
    seq: 2,
    type: 'request',
    command: 'change' as ts.server.protocol.CommandTypes.Change,
    arguments: { line: 9, offset: 1, endLine: 9, endOffset: 1, insertString: 'const [n] = css("new") satisfies Css<{color: "pink"}>\n', file },
  } satisfies ts.server.protocol.ChangeRequest)
  await triggerUpdateViaHints()
  const mtime3 = fs.statSync(output).mtimeMs
  assert(mtime3 > mtime);

  assert.equal(
    (await parseBulkOutputCss(updateBasename, false)).get(tsBasename),
    String(readFileSync(path.join(import.meta.dirname, updateBasename, tsBasename.replace('.ts', '.1.css')))).trim()
  )
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
  const logFile = path.join(import.meta.dirname, 'tsserver-laim.log');

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
    // console.info(data)
  })
  readline.createInterface({input: h.stderr!}).on('line', (data) => {
    console.error(data)
  })
  for (const projectDirName of getProjectBasenames()) {
    sendRequest(h, {
      seq: 0,
      type: 'request',
      command: 'open' as ts.server.protocol.CommandTypes.Open,
      arguments: {
        file: path.join(import.meta.dirname, projectDirName, getTsBasenames(projectDirName)[0]),
        scriptKindName: 'TS',
      },
    } satisfies ts.server.protocol.OpenRequest)
  }

  return h
}

function sendRequestAndWait(h: ChildProcess, request: ts.server.protocol.Request) {
  return new Promise(resolve => {
    readline.createInterface({input: h.stdout!}).on('line', (data) => {
      if (data.startsWith('{')) {
        const response = JSON.parse(data) as ts.server.protocol.Response
        if (response.request_seq === request.seq) {
          resolve(response)
        }
      }
    })
    sendRequest(h, request)
  })
}

function sendRequest(h: ChildProcess, request: ts.server.protocol.Request) {
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

function getProjectBasenames() : string[] {
  return fs.readdirSync(import.meta.dirname, {withFileTypes: true})
    .filter(ent => ent.isDirectory())
    .map(ent => ent.name)
    // .filter(dir => dir === 'prefix')
}

function getCssBasenames(projectBasename: string) {
  return fs.readdirSync(path.join(import.meta.dirname, projectBasename))
    .filter(f => f.endsWith('.css') && !f.endsWith('.1.css') && f !== outputBasename)
    // .filter(f => f.includes('constLabel'))
}

function getTsBasenames(projectBasename: string) {
  return getCssBasenames(projectBasename).map(f => f.replace('.css', '.ts'))
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
    const m = /^\/\* (src|end): ([\w/.]+) \*\/$/.exec(l)
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
