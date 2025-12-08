import { parseCmd } from './parseCmd.mjs'
import { test } from '../../../testUtil/test.mjs'
import * as assert from 'node:assert'

test('simple', () => {
  const cmd = parseCmd(['node', 'typique.mjs', '--projectFile', './a.ts'])
  assert.deepStrictEqual(cmd, {
    projectFile: './a.ts',
    tsserver: undefined,
    tsArgs: [],
  })
})

test('with tsserver', () => {
  const cmd = parseCmd(['node', 'typique.mjs', '--projectFile', './a.ts', '--tsserver', './path/to/tsserver'])
  assert.deepStrictEqual(cmd, {
    projectFile: './a.ts',
    tsserver: './path/to/tsserver',
    tsArgs: [],
  })
})

test('with ts-args', () => {
  const cmd = parseCmd(['node', 'typique.mjs', '--projectFile', './a.ts', '--', '--foo', '--bar'])
  assert.deepStrictEqual(cmd, {
    projectFile: './a.ts',
    tsserver: undefined,
    tsArgs: ['--foo', '--bar'],
  })
})

test('bad arg', () => {
  try {
    parseCmd(['node', 'typique.mjs', '--tsconfig', './tsconfig.json'])
    assert.fail('expected error')
  } catch (e) {
    assert.strictEqual(e.message, 'Unknown argument: --tsconfig')
  }
})
