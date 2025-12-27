import { tokenize } from './markupTokenizer.ts'
import { test } from 'test-util'
import assert from 'node:assert'

test('empty', () => {
  assert.deepEqual([...tokenize('')], [])
})

test('spaces', () => {
  assert.deepEqual([...tokenize(' \n')], [])
})

test('ids', () => {
  assert.deepEqual([...tokenize('ab cd')], ['ab', 'cd'])
})

test('numbers', () => {
  assert.deepEqual([...tokenize('12  34')], ['12', '34'])
})

test('strings', () => {
  assert.deepEqual([...tokenize("'a b 12''\\'../esc\\''")], ['a b 12', "'../esc'"])
})

test('unterminated str', () => {
  try {
    [...tokenize("'a ")]
    assert.fail('expected error')
  } catch (_) {
  }
})

test('unterminated escape', () => {
  try {
    [...tokenize("'a\\")]
    assert.fail('expected error')
  } catch (_) {
  }
})

test('number then id', () => {
  assert.deepEqual([...tokenize('12ab')], ['12', 'ab'])
})

test('number then string', () => {
  assert.deepEqual([...tokenize("12'ab'")], ['12', 'ab'])
})

test('string then id', () => {
  assert.deepEqual([...tokenize("'a b'a b")], ['a b', 'a', 'b'])
})

test('string then number', () => {
  assert.deepEqual([...tokenize("'ab'12")], ['ab', '12'])
})
