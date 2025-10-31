import {parseWords} from './parseWords.ts'
import {test} from '../testUtil/test.mjs'
import assert from 'node:assert'

test('empty', () => {
  assert.deepStrictEqual([...parseWords('')], [])
})

test('blank', () => {
  assert.deepStrictEqual([...parseWords('  ')], [])
})

test('only', () => {
  assert.deepStrictEqual([...parseWords(' a ')], ['a'])
})

test('longer', () => {
  assert.deepStrictEqual([...parseWords(' abc ')], ['abc'])
})

test('simple', () => {
  assert.deepStrictEqual([...parseWords(' a-b c ')], ['a-b', 'c'])
})

test('quoted no space', () => {
  assert.deepStrictEqual([...parseWords(' a`b c`d ')], ['a', 'b c', 'd'])
})

test('quoted empty str', () => {
  assert.deepStrictEqual([...parseWords(' ""``')], ['', ''])
})

test('two quoted no space', () => {
  assert.deepStrictEqual([...parseWords('"a b""c,d"')], ['a b', 'c,d'])
})

test('quoted escapes', () => {
  assert.deepStrictEqual([...parseWords(`"a\\"b" 'c\\''`)], ['a"b', "c'"])
})

test('backslash escapes', () => {
  assert.deepStrictEqual([...parseWords('"\\\\"')], ['\\'])
})

test('newline tab escapes', () => {
  assert.deepStrictEqual([...parseWords('"a\nb\rc\t"')], ['a\nb\rc\t'])
})
