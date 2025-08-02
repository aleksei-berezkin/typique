import { test } from 'uvu'
import fs from 'node:fs'
import path from 'node:path'
import subprocess from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'

// let tsProcess: ChildProcess | undefined = undefined
test.before(async () => {
  subprocess.execSync(`rm -f ${path.join(import.meta.dirname, 'laim-output.css')}`)

  const h = subprocess.execFile(
    'node', [
      path.join(import.meta.dirname, '../node_modules/typescript/lib/tsserver.js'),
      '--logVerbosity', 'verbose',
      '--logFile', path.join(import.meta.dirname, `tsserver-${Date.now()}.log`),
    ],
  )
  readline.createInterface({input: h.stdout!}).on('line', (data) => {
    console.info(data)
  })
  readline.createInterface({input: h.stderr!}).on('line', (data) => {
    console.error(data)
  })
  const openCmd: ts.server.protocol.OpenRequest = {
    seq: 0,
    type: 'request',
    command: 'open' as ts.server.protocol.CommandTypes.Open,
    arguments: {
      file: path.join(import.meta.dirname, 'localMediaGlobal.ts'),
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
})

test('simple', async () => {
  console.log('simple')
})

test.run()
