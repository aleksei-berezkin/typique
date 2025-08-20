import { test } from 'uvu'
import assert from 'node:assert'
import { parseClassNamePattern } from './classNamePattern'

test('empty', () => {
  assert.deepEqual(parseClassNamePattern(''), [])
})

test('const', () => {
  assert.deepEqual(parseClassNamePattern('abc'), ['abc'])
})

test('default', () => {
  assert.deepEqual(parseClassNamePattern('${varName}'), [{type: 'varName'}])
})

test('with prefix and suffix', () => {
  assert.deepEqual(parseClassNamePattern('ab-${varName}_cd'), ['ab-', {type: 'varName'}, '_cd'])
})

test('with counter', () => {
  assert.deepEqual(parseClassNamePattern('${varName}-${counter}'), [{type: 'varName'}, '-', {type: 'counter'}])
})

const alphabetL = Array.from({length: 26}, (_, i) => String.fromCharCode('a'.charCodeAt(0) + i)).join('')
const alphabetU = Array.from({length: 26}, (_, i) => String.fromCharCode('A'.charCodeAt(0) + i)).join('')
const alphabet = alphabetL + alphabetU
const numbers = Array.from({length: 10}, (_, i) => i).join('')

test('with random', () => {
  assert.deepEqual(parseClassNamePattern('${varName}-${random(5)}'), [{type: 'varName'}, '-', {type: 'random', n: 5, possibleChars: alphabet + numbers + '-_' }])
})

test('with randomAlpha', () => {
  assert.deepEqual(parseClassNamePattern('${randomAlpha(3)}_${varName}'), [{type: 'random', n: 3, possibleChars: alphabet}, '_', {type: 'varName'}])
})

test.run()
