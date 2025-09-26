import { FileHandle } from 'node:fs/promises'

export const defaultBufSize = 256
export class BufferWriter {
  bufSize: number
  buffers: Buffer[]
  written: number[]
  header: string
  footer: string

  constructor(bufSize: number = defaultBufSize, header: string = '', footer: string = '') {
    this.bufSize = bufSize
    this.buffers = []
    this.written = []
    this.header = header
    this.footer = footer
  }

  size() {
    return this.written.reduce((a, b) => a + b, 0)
  }

  write(...text: string[]) {
    if (!this.buffers.length) {
      this.addBuf()
      this.doWrite(this.header)
    }

    for (const str of text) {
      this.doWrite(str)
    }
  }

  private doWrite(str: string) {
    const buffer = this.buffers[this.buffers.length - 1]
    const bufOffset = this.written[this.written.length - 1]
    const {read, written} = new TextEncoder().encodeInto(str, buffer.subarray(bufOffset))
    this.written[this.written.length - 1] += written
    if (read < str.length) {
      this.addBuf()
      this.doWrite(str.slice(read))
    }
  }

  private addBuf() {
    this.buffers.push(Buffer.alloc(this.bufSize))
    this.written.push(0)
  }

  finalize(): BufferWriter | undefined {
    if (!this.buffers.length) {
      return undefined
    }

    this.doWrite(this.footer)

    for (let i = 0; i < this.buffers.length; i++) {
      if (this.written[i] < this.buffers[i].length) {
        const newBuf = Buffer.alloc(this.written[i])
        this.buffers[i].copy(newBuf, 0, 0, this.written[i])
        this.buffers[i] = newBuf
      }
    }

    return this
  }

  async toFile(h: FileHandle) {
    let written = 0
    for (let i = 0; i < this.buffers.length; i++) {
      const {bytesWritten} = await h.write(this.buffers[i], 0, this.written[i])
      written += bytesWritten
    }
    return written
  }

  copyToBuffer(targetBuf: Buffer, targetStart: number) {
    let targetOffset = targetStart
    for (let i = 0; i < this.buffers.length; i++) {
      targetOffset += this.buffers[i].copy(targetBuf, targetOffset, 0, this.written[i])
    }
    return targetOffset - targetStart
  }

  equals(other: BufferWriter) {
    if (this.buffers.length !== other.buffers.length) {
      return false
    }
    for (let i = 0; i < this.buffers.length; i++) {
      if (!this.buffers[i].equals(other.buffers[i])) {
        return false
      }
    }
    return true
  }
}

export function areWritersEqual(w1: BufferWriter | undefined, w2: BufferWriter | undefined) {
  if (!w1 && !w2) {
    return true
  }
  if (!w1 || !w2) {
    return false
  }
  return w1.equals(w2)
}
