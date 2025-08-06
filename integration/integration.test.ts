import { test } from 'uvu'
import assert from 'node:assert'
import fs, { readFileSync } from 'node:fs'
import path from 'node:path'
import subprocess from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'

const outputFile = path.join(import.meta.dirname, 'laim-output.css')
const logFile = path.join(import.meta.dirname, 'tsserver-laim.log')

const nameToContent = new Map<string, string>()

let h: ChildProcess

test.before(async () => {
  [outputFile, logFile].forEach(f =>
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
  const openRequest: ts.server.protocol.OpenRequest = {
    seq: 0,
    type: 'request',
    command: 'open' as ts.server.protocol.CommandTypes.Open,
    arguments: {
      file: path.join(import.meta.dirname, getTsFiles()[0]),
      scriptKindName: 'TS',
    },
  }
  h.stdin!.write(JSON.stringify(openRequest) + '\n')

  while (!fs.existsSync(outputFile)) {
    await delay(200)
  }
  await delay(100)

  let currentFile: string | undefined = undefined
  for (const l of String(fs.readFileSync(outputFile)).split('\n')) {
    const m = /^\/\* (src|end): ([\w/.]+) \*\/$/.exec(l)
    if (m) {
      if (currentFile) {
        if (m[1] !== 'end')
          throw new Error(`Expected 'end' but got '${l}'`)
        currentFile = undefined
      } else {
        if (m[1] !== 'src')
          throw new Error(`Expected 'src' but got '${l}'`)
        currentFile = m[2]
      }
    } else {
      if (currentFile) {
        const content = nameToContent.get(currentFile)
        nameToContent.set(currentFile, content ? `${content}\n${l}` : l)
      } else if (l) {
        const e = new Error(`Expected 'src' or 'end' but got '${l}'`)
        console.error(e)
        throw e // doesn't fail the test
      }
    }
  }
})

test.after(async () => {
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
})

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

test('names', () => {
  assert.deepEqual(
    new Set(nameToContent.keys()),
    new Set(getTsFiles())
  )
})

for (const cssF of getCssFiles()) {
  test(cssF, () => {
    const expected = String(readFileSync(path.join(import.meta.dirname, cssF))).trim()
    const actual = nameToContent.get(cssF.replace('.css', '.ts'))
    assert.equal(actual, expected)
  })
}

function getCssFiles() {
  return fs.readdirSync(import.meta.dirname)
    .filter(f => f.endsWith('.css') && f !== path.basename(outputFile))
    // .filter(f => f.includes('constLabel'))
}

function getTsFiles() {
  return getCssFiles().map(f => f.replace('.css', '.ts'))
}

test.run()
