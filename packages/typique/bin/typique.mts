#!/usr/bin/env node

import { parseCmd } from './parseCmd.mjs'
import type TS from 'typescript'
import { delay, sendRequest, sendRequestAndWait, shutdownServer, startServer } from './server.mjs'
import path from 'node:path'

const {projectFile, tsserver, tsArgs} = parseCmd(process.argv)

const server = await startServer(
  tsserver,
  tsArgs,
)

const file = path.isAbsolute(projectFile) ? projectFile : path.join(process.cwd(), projectFile)

sendRequest(server, {
  seq: server.nextSeq++,
  type: 'request',
  command: 'open' as TS.server.protocol.CommandTypes.Open,
  arguments: { file },
} satisfies TS.server.protocol.OpenRequest)

// 'open' doesn't send response in old TS versions
// so we request hints and wait for the response
await sendRequestAndWait(server, {
  seq: server.nextSeq++,
  type: 'request',
  command: 'provideInlayHints' as TS.server.protocol.CommandTypes.ProvideInlayHints,
  arguments: { file, start: 0, length: 1 },
} satisfies TS.server.protocol.InlayHintsRequest)

// TODO custom event or method
await delay(250) // Server writes async

await shutdownServer(server)
