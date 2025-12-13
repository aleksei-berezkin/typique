#!/usr/bin/env node

import { parseCmd } from './parseCmd.mjs'
import type ts from 'typescript'
import { delay, sendRequestAndWait, shutdownServer, startServer } from './server.mjs'
import path from 'node:path'

const {projectFile, tsserver, tsArgs} = parseCmd(process.argv)

const server = await startServer(
  tsserver,
  tsArgs,
)

const file = path.isAbsolute(projectFile) ? projectFile : path.join(process.cwd(), projectFile)

const openResponse = await sendRequestAndWait(server, {
  seq: server.nextSeq++,
  type: 'request',
  command: 'open' as ts.server.protocol.CommandTypes.Open,
  arguments: { file },
} satisfies ts.server.protocol.OpenRequest)

if (openResponse && !openResponse.success) {
  console.error(`Error opening ${file} on server ${server.tsserverExec}`)
  console.error(openResponse.message)
  process.exit(1)
}

// TODO custom event or method
await delay(250) // Server writes async

await shutdownServer(server)
