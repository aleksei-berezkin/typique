import { areWritersEqual, BufferWriter } from './BufferWriter'
import { test } from 'uvu'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

test('simple', () => {
  const wr = new BufferWriter(8)
  wr.write('hello')

  assert.deepEqual(wr.written, [5])
  assert.deepEqual(wr.buffers, [Buffer.from('hello\0\0\0')])
})

test('finallize', () => {
  const wr = new BufferWriter(8)
  wr.write('hi')
  const w = wr.finalize()
  assert.equal(w, wr)
  assert.deepEqual(wr.written, [2])
  assert.deepEqual(wr.buffers, [Buffer.from('hi')])
})

test('fragment', () => {
  const wr = new BufferWriter(3)
  wr.write('Frühling')
  assert.deepEqual(wr.written, [2, 3, 3, 1])
  assert.deepEqual(
    wr.buffers,
    [
      Buffer.from('Fr\0'),
      Buffer.from('üh'),
      Buffer.from('lin'),
      Buffer.from('g\0\0'),
    ]
  )
})

test('finallize empty', () => {
  const wr = new BufferWriter(4)
  const w = wr.finalize()
  assert.deepEqual(wr.written, [])
  assert.deepEqual(wr.buffers, [])
  assert.equal(w, undefined)
})

test('write to file', async () => {
  const wr = new BufferWriter(5)
  wr.write('Erklärung')
  assert.deepEqual(wr.written, [4, 5, 1])

  const p = tmpFileName()
  try {
    const h = await fs.open(p, 'w')
    try {
      const written = await wr.toFile(h)
      assert.equal(written, 10)
    } finally {
      await h.close()
    }

    const content = await fs.readFile(p)
    assert.equal(String(content), 'Erklärung')
  } finally {
    await fs.rm(p)
  }
})

function tmpFileName() {
  return path.join(os.tmpdir(), `typique-buf-wr-test-${Date.now()}.tmp`)
}

test('equal fn', () => {
  assert.equal(areWritersEqual(undefined, undefined), true)
  assert.equal(areWritersEqual(undefined, new BufferWriter()), false)
  assert.equal(areWritersEqual(new BufferWriter(), undefined), false)
  assert.equal(areWritersEqual(new BufferWriter(), new BufferWriter()), true)
})

test('unused prefix suffix', () => {
  const wr = new BufferWriter(8, 'prefix', 'suffix')
  assert.equal(undefined, wr.finalize())
})

test('prefix', () => {
  const wr = new BufferWriter(8, 'prefix ')
  wr.write('hello')
  assert.deepEqual(wr.written, [8, 4])
  assert.deepEqual(wr.buffers, [Buffer.from('prefix h'), Buffer.from('ello\0\0\0\0')])
})

test('unused suffix', () => {
  const wr = new BufferWriter(8, '', ' suffix')
  wr.write('hello')
  assert.deepEqual(wr.written, [5])
  assert.deepEqual(wr.buffers, [Buffer.from('hello\0\0\0')])
})

test('suffix', () => {
  const wr = new BufferWriter(8, '', ' suffix')
  wr.write('hello')
  const wr1 = wr.finalize()
  assert.equal(wr1, wr)
  assert.deepEqual(wr.written, [8, 4])
  assert.deepEqual(wr.buffers, [Buffer.from('hello su'), Buffer.from('ffix')])
})

test.run()
