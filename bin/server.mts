import subprocess from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'
import type ts from 'typescript/lib/tsserverlibrary.d.ts'
import url from 'node:url'


type Server = {
  h: ChildProcess
  nextSeq: number
  pendingSeqToResponseConsumer: Map<number, {resolve: (response: ts.server.protocol.Response) => void, reject: (error: Error) => void}>
}

export async function startServer(tsserver: string | undefined, args: string[]): Promise<Server> {
  const h = subprocess.execFile(
    process.execPath,
    [
      // '--inspect-brk=9779',
      tsserver ?? url.fileURLToPath(import.meta.resolve('typescript/lib/tsserver.js')),
      ...args,
    ],
  )

  const pendingSeqToResponseConsumer = new Map()
  readline.createInterface({input: h.stdout!}).on('line', (data) => {
    if (data.startsWith('{')) {
      const response = JSON.parse(data)
      const {request_seq} = response
      const consumer = pendingSeqToResponseConsumer.get(request_seq)
      if (consumer) {
        pendingSeqToResponseConsumer.delete(request_seq)
        consumer.resolve(response)
      }
    }
  })

  readline.createInterface({input: h.stderr!}).on('line', (data) => {
    console.error(data)
  })

  return {
    h,
    nextSeq: 0,
    pendingSeqToResponseConsumer,
  }
}

export function sendRequestAndWait<R extends ts.server.protocol.Response>(server: Server, request: ts.server.protocol.Request) {
  return new Promise<R>((resolve: any, reject: any) => {
    server.pendingSeqToResponseConsumer.set(request.seq, {resolve, reject})
    sendRequest(server, request)
  })
}

export function sendRequest(server: Server, request: ts.server.protocol.Request) {
  server.h.stdin!.write(JSON.stringify(request) + '\n')
}

export async function shutdownServer(server: Server) {
  sendRequest(server, {
    seq: server.nextSeq++,
    type: 'request',
    command: 'exit' as ts.server.protocol.CommandTypes.Exit,
  })

  while (server.h.exitCode == null) {
    await delay(50)
  }

  [...server.pendingSeqToResponseConsumer.values()].forEach(r => r.reject(new Error('tsserver exited')))

  if (server.h.exitCode !== 0)
    throw new Error(`tsserver exited with code ${server.h.exitCode}`)
}

export function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
