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

  test(projectBasename, () => {
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
    const openRequest: ts.server.protocol.OpenRequest = {
      seq: 0,
      type: 'request',
      command: 'open' as ts.server.protocol.CommandTypes.Open,
      arguments: {
        file: path.join(import.meta.dirname, projectDirName, getTsBasenames(projectDirName)[0]),
        scriptKindName: 'TS',
      },
    }
    h.stdin!.write(JSON.stringify(openRequest) + '\n')
  }

  return h
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
    .filter(f => f.endsWith('.css') && f !== outputBasename)
    // .filter(f => f.includes('constLabel'))
}

function getTsBasenames(projectBasename: string) {
  return getCssBasenames(projectBasename).map(f => f.replace('.css', '.ts'))
}

function getOutputFile(projectBasename: string) {
  return path.join(import.meta.dirname, projectBasename, outputBasename)
}

async function parseBulkOutputCss(projectBasename: string) {
  const outputFile = getOutputFile(projectBasename)
  await awaitFile(outputFile)
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
