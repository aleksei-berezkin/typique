import { test } from 'uvu'
import assert from 'node:assert'
import { parseClassNamePattern, renderCompletionItems } from './classNamePattern'

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
  assert.deepEqual(
    parseClassNamePattern('${varName}-${random(5)}'),
    [{type: 'varName'}, '-', {type: 'random', n: 5, possibleChars: alphabet + numbers + '-_' }],
  )
})

test('with randomAlpha', () => {
  assert.deepEqual(
    parseClassNamePattern('${randomAlpha(3)}_${varName}'),
    [{type: 'random', n: 3, possibleChars: alphabet}, '_', {type: 'varName'}]
  )
})

test('with randomAlphaNumeric', () => {
  assert.deepEqual(
    parseClassNamePattern('${randomAlphaNumeric(3)}_${varName}'),
    [{type: 'random', n: 3, possibleChars: alphabet + numbers}, '_', {type: 'varName'}]
  )
})

test('with randomNumeric', () => {
  assert.deepEqual(
    parseClassNamePattern('${randomNumeric(3)}-${varName}'),
    [{type: 'random', n: 3, possibleChars: numbers}, '-', {type: 'varName'}]
  )
})

test('render default', () => {
  const items = render('${varName}', ['a', 'b'], ['a', 'a-0'])
  assert.deepEqual(
    items,
    ['a-1', 'b'],
  )
})

test('render with random', () => {
  const items = render('${varName}-${randomAlpha(3)}', ['a'], ['a-YfO'])
  assert.deepEqual(
    items,
    ['a-tyJ'],
  )
})

test('render random and counter', () => {
  const items = render('${varName}-${randomNumeric(4)}_${counter}', ['a', 'b'], ['a-9173_0'])
  assert.deepEqual(
    items,
    ['a-4619_0', 'b-0908_0'],
  )
})

test('no var name', () => {
  const items = render('x', ['a', 'b'], ['x'])
  assert.deepEqual(
    items,
    ['x-0'],
  )
})

test('no var name explicit counter', () => {
  const items = render('x-${counter}', ['a', 'b'], ['x-0'])
  assert.deepEqual(
    items,
    ['x-1'],
  )
})

test('no var name random', () => {
  const items = render('y-${random(2)}', ['a', 'b'], ['y-9h', 'y-Xx', 'y-ER', 'y-m6'])
  assert.deepEqual(
    items,
    ['y-b_'],
  )
})

function render(pattern: string, varNameVariants: string[], existingClassNames: string[]) {
  const randomGen = (function* () {
    for (let i = 0; ; i++)
      yield (Math.sin(2000 + i * 10_000) + 1) / 2
  })()
  return renderCompletionItems(
    parseClassNamePattern(pattern),
    varNameVariants,
    new Map(existingClassNames.map(it => [it, undefined])),
    10,
    10,
    () => randomGen.next().value
  )
}

test.run()
