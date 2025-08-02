import { test } from 'uvu'
import assert from 'node:assert'
import fs, { readFileSync } from 'node:fs'
import path from 'node:path'
import subprocess from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'

const nameToContent = new Map<string, string>()

let h: ChildProcess

test.before(async () => {
  subprocess.execSync(`rm -f ${path.join(import.meta.dirname, 'laim-output.css')}`)

  h = subprocess.execFile(
    'node', [
      path.join(import.meta.dirname, '../node_modules/typescript/lib/tsserver.js'),
      '--logVerbosity', 'verbose',
      '--logFile', path.join(import.meta.dirname, `tsserver-${Date.now()}.log`),
    ],
  )
  readline.createInterface({input: h.stdout!}).on('line', (data) => {
    // console.info(data)
  })
  readline.createInterface({input: h.stderr!}).on('line', (data) => {
    console.error(data)
  })
  const openCmd: ts.server.protocol.OpenRequest = {
    seq: 0,
    type: 'request',
    command: 'open' as ts.server.protocol.CommandTypes.Open,
    arguments: {
      file: path.join(import.meta.dirname, getCssFiles()[0].replace('.css', '.ts')),
      scriptKindName: 'TS',
    },
  }
  h.stdin?.write(JSON.stringify(openCmd) + '\n')

  const outputFile = path.join(import.meta.dirname, 'laim-output.css')
  function delay(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }
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

test.after(() => {
  h.kill()
})

test('files names', () => {
  assert.deepEqual(
    new Set(nameToContent.keys()),
    new Set(getCssFiles().map(f => f.replace('.css', '.ts')))
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
    .filter(f => f.endsWith('.css') && f !== 'laim-output.css')
}

test.run()
