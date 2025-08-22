import { test } from 'uvu'
import assert from 'node:assert'
import { parseClassNamePattern, renderClassNamesForMultipleVars, renderClassNamesForOneVar } from './classNamePattern'

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
  const classNames = renderForOne('${varName}', ['a', 'b'], ['a', 'a-0'])
  assert.deepEqual(
    classNames,
    ['a-1', 'b'],
  )
})

test('render with random', () => {
  const classNames = renderForOne('${varName}-${randomAlpha(3)}', ['a'], ['a-YfO'])
  assert.deepEqual(
    classNames,
    ['a-tyJ'],
  )
})

test('render random and counter', () => {
  const classNames = renderForOne('${varName}-${randomNumeric(4)}_${counter}', ['a', 'b'], ['a-9173_0'])
  assert.deepEqual(
    classNames,
    ['a-4619_0', 'b-0908_0'],
  )
})

test('no var name', () => {
  const classNames = renderForOne('x', ['a', 'b'], ['x'])
  assert.deepEqual(
    classNames,
    ['x-0'],
  )
})

test('no var name explicit counter', () => {
  const classNames = renderForOne('x-${counter}', ['a', 'b'], ['x-0'])
  assert.deepEqual(
    classNames,
    ['x-1'],
  )
})

test('no var name random', () => {
  const classNames = renderForOne('y-${random(2)}', ['a', 'b'], ['y-9h', 'y-Xx', 'y-ER', 'y-m6'])
  assert.deepEqual(
    classNames,
    ['y-b_'],
  )
})

test('render multiple vars default', () => {
  const classNames = renderForMultiple('${varName}', ['a', 'b'], ['a', 'a-0', 'b', ])
  assert.deepEqual(
    classNames,
    ['a-1', 'b-1'],
  )
})

test('render multiple vars no var name', () => {
  const classNames = renderForMultiple('x', ['a', 'b'], ['x', 'x-0', 'x-1', 'x-3'])
  assert.deepEqual(
    classNames,
    ['x-2', 'x-4'],
  )
})

test('render multiple vars no var name rnd', () => {
  const classNames = renderForMultiple('x-${randomAlpha(1)}', ['a', 'b'], ['x-Y'])
  assert.deepEqual(
    classNames,
    ['x-f', 'x-O'],
  )
})

test('render multiple vars with random', () => {
  const classNames = renderForMultiple('${varName}-${randomAlpha(2)}', ['a', 'b'], ['c-Yf'])
  assert.deepEqual(
    classNames,
    ['a-Yf', 'b-Yf'],
  )
})

test('render multiple vars explicit counter', () => {
  const classNames = renderForMultiple('${varName}-${counter}', ['a', 'b', 'c'], ['a-0', 'b-1', 'c-2', 'a-3'])
  assert.deepEqual(
    classNames,
    ['a-4', 'b-4', 'c-4'],
  )
})

test('render multiple vars with prefix and suffix', () => {
  const classNames = renderForMultiple('my-${varName}-x', ['a', 'b', 'c'], ['my-a-x', 'my-b-0-x'])
  assert.deepEqual(
    classNames,
    ['my-a-1-x', 'my-b-1-x', 'my-c-1-x'],
  )
})

const maxCounter = 10
const maxRandomRetries = 10

function renderForOne(pattern: string, varNameVariants: string[], existingClassNames: string[]) {
  return renderClassNamesForOneVar(
    parseClassNamePattern(pattern),
    varNameVariants,
    {
      isUsed: cn => existingClassNames.includes(cn),
      maxCounter,
      maxRandomRetries,
      randomGen: getRandomGen()
    }
  )
}

function renderForMultiple(pattern: string, varsNames: string[], existingClassNames: string[]) {
  return renderClassNamesForMultipleVars(
    parseClassNamePattern(pattern),
    varsNames,
    {
      isUsed: cn => existingClassNames.includes(cn),
      maxCounter,
      maxRandomRetries,
      randomGen: getRandomGen()
    }
  )
}

function getRandomGen() {
  const randomGen = (function* () {
    for (let i = 0; ; i++)
      yield (Math.sin(2000 + i * 10_000) + 1) / 2
  })()
  return () => randomGen.next().value
}



test.run()
