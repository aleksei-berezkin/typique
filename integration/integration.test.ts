import { test } from 'uvu'
import assert from 'node:assert'
import fs, { readFileSync } from 'node:fs'
import path from 'node:path'
import subprocess from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'


const outputBasename = 'laim-output.css'
const projectToNameToContent = new Map<string, Map<string, string>>()

let h: ChildProcess

test.before(async () => {
  const outputFiles = getProjectBasenames().map( p => path.join(import.meta.dirname, p, outputBasename))
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

  while (!outputFiles.every(f => fs.existsSync(f))) {
    await delay(200)
  }
  await delay(100)

  for (const projectDirName of getProjectBasenames()) {
    const currentMap = new Map<string, string>()
    let currentFile: string | undefined = undefined
    for (const l of String(fs.readFileSync(path.join(import.meta.dirname, projectDirName, outputBasename))).split('\n')) {
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
          const content = currentMap.get(currentFile)
          currentMap.set(currentFile, content ? `${content}\n${l}` : l)
        } else if (l) {
          const e = new Error(`Expected 'src' or 'end' but got '${l}'`)
          console.error(e)
          throw e // doesn't fail the test
        }
      }
    }
    projectToNameToContent.set(projectDirName, currentMap)
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
    new Set(projectToNameToContent.keys()),
    new Set(getProjectBasenames()),
  )
  for (const projectDirName of getProjectBasenames()) {
    const names = projectToNameToContent.get(projectDirName)!
    assert.deepEqual(
      new Set(names.keys()),
      new Set(getTsBasenames(projectDirName)),
    )
  }
})

for (const projectDirName of getProjectBasenames()) {
  for (const cssFile of getProjectBasenames().flatMap(getCssBasenames)) {
    test(`${projectDirName}/${cssFile}`, () => {
      const expected = String(readFileSync(path.join(import.meta.dirname, projectDirName, cssFile))).trim()
      const actual = projectToNameToContent.get(projectDirName)!.get(cssFile.replace('.css', '.ts'))
      assert.equal(actual, expected)
    })
  }
}

function getProjectBasenames() : string[] {
  return fs.readdirSync(import.meta.dirname, {withFileTypes: true})
    .filter(ent => ent.isDirectory())
    .map(ent => ent.name)
    // .filter(dir => dir === 'basic')
}

function getCssBasenames(projectBasename: string) {
  return fs.readdirSync(path.join(import.meta.dirname, projectBasename))
    .filter(f => f.endsWith('.css') && f !== outputBasename)
    // .filter(f => f.includes('constLabel'))
}

function getTsBasenames(projectBasename: string) {
  return getCssBasenames(projectBasename).map(f => f.replace('.css', '.ts'))
}

test.run()
