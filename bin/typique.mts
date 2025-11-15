#!/usr/bin/env node

import { parseCmd } from './parseCmd.mjs'
import child_process from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import type ts from 'typescript'

const {projectFile, tsserver, tsArgs} = parseCmd(process.argv)

const tsserverExec = getTsserverExec(tsserver)

const h = child_process.execFile(
  process.execPath,
  [
    // '--inspect-brk=9779',
    tsserverExec,
    ...tsArgs,
  ],
)

sendRequest({
  seq: 0,
  type: 'request',
  command: 'open' as ts.server.protocol.CommandTypes.Open,
  arguments: { file: projectFile },
} satisfies ts.server.protocol.OpenRequest)

setTimeout(() => {
  sendRequest({
    seq: 1,
    type: 'request',
    command: 'exit' as ts.server.protocol.CommandTypes.Exit,
  })
}, 3000) // writes file async

// *** Util ***

function getTsserverExec(tsserverByConfig: string | undefined) {
  if (tsserverByConfig != null) {
    return path.isAbsolute(tsserverByConfig)
      ? tsserverByConfig
      : path.join(process.cwd(), tsserverByConfig)
  }

  const tsserverUrl = import.meta.resolve('typescript/lib/tsserver.js')
  const tsserverPath = url.fileURLToPath(tsserverUrl)
  if (!fs.existsSync(tsserverPath)) {
    throw new Error(`Cannot find tsserver at ${tsserverPath}`)
  }

  return tsserverPath
}

function sendRequest(request: ts.server.protocol.Request) {
  h.stdin!.write(JSON.stringify(request) + '\n')
}
