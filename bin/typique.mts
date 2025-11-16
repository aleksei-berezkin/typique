#!/usr/bin/env node

import { parseCmd } from './parseCmd.mjs'
import type ts from 'typescript'
import { delay, sendRequestAndWait, shutdownServer, startServer } from './server.mjs'

const {projectFile, tsserver, tsArgs} = parseCmd(process.argv)

const server = await startServer(
  tsserver,
  tsArgs,
)

await sendRequestAndWait(server, {
  seq: 0,
  type: 'request',
  command: 'open' as ts.server.protocol.CommandTypes.Open,
  arguments: { file: projectFile },
} satisfies ts.server.protocol.OpenRequest)

// TODO custom event or method
await delay(250) // Server writes async

await shutdownServer(server)
