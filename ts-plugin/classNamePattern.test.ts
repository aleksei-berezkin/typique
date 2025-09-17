import { test } from 'uvu'
import assert from 'node:assert'
import { classNameMatchesPattern, parseClassNamePattern, renderClassNamesForMultipleVars, renderClassNamesForOneVar } from './classNamePattern'

test('empty', () => {
  assert.deepEqual(parseClassNamePattern(''), [])
})

test('const', () => {
  assert.deepEqual(parseClassNamePattern('abc'), ['abc'])
})

test('default', () => {
  assert.deepEqual(parseClassNamePattern('${contextName}'), [{type: 'contextName'}])
})

test('with prefix and suffix', () => {
  assert.deepEqual(parseClassNamePattern('ab-${contextName}_cd'), ['ab-', {type: 'contextName'}, '_cd'])
})

test('with counter', () => {
  assert.deepEqual(parseClassNamePattern('${contextName}-${counter}'), [{type: 'contextName'}, '-', {type: 'counter'}])
})

const alphabetL = Array.from({length: 26}, (_, i) => String.fromCharCode('a'.charCodeAt(0) + i)).join('')
const alphabetU = Array.from({length: 26}, (_, i) => String.fromCharCode('A'.charCodeAt(0) + i)).join('')
const alphabet = alphabetL + alphabetU
const numbers = Array.from({length: 10}, (_, i) => i).join('')

test('with random', () => {
  assert.deepEqual(
    parseClassNamePattern('${contextName}-${random(5)}'),
    [{type: 'contextName'}, '-', {type: 'random', n: 5, possibleChars: alphabet + numbers}],
  )
})

test('with randomAlpha', () => {
  assert.deepEqual(
    parseClassNamePattern('${randomAlpha(3)}_${contextName}'),
    [{type: 'random', n: 3, possibleChars: alphabet}, '_', {type: 'contextName'}]
  )
})

test('with randomNumeric', () => {
  assert.deepEqual(
    parseClassNamePattern('${randomNumeric(3)}-${contextName}'),
    [{type: 'random', n: 3, possibleChars: numbers}, '-', {type: 'contextName'}]
  )
})

test('render default', () => {
  const classNames = renderForOne('${contextName}', ['a', 'b'], ['a', 'a-0'])
  assert.deepEqual(
    classNames,
    ['a-1', 'b'],
  )
})

test('render with random', () => {
  const classNames = renderForOne('${contextName}-${randomAlpha(3)}', ['a'], ['a-YfO'])
  assert.deepEqual(
    classNames,
    ['a-tyJ'],
  )
})

test('render random and counter', () => {
  const classNames = renderForOne('${contextName}-${randomNumeric(4)}_${counter}', ['a', 'b'], ['a-9173_0'])
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
  const classNames = renderForOne('y-${random(2)}', ['a', 'b'], ['y-7h', 'y-Vw'])
  assert.deepEqual(
    classNames,
    ['y-DP'],
  )
})

test('render multiple vars default', () => {
  const classNames = renderForMultiple('${contextName}', ['a', 'b'], ['a', 'a-0', 'b', ])
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
  const classNames = renderForMultiple('${contextName}-${randomAlpha(2)}', ['a', 'b'], ['c-Yf'])
  assert.deepEqual(
    classNames,
    ['a-Yf', 'b-Yf'],
  )
})

test('render multiple vars explicit counter', () => {
  const classNames = renderForMultiple('${contextName}-${counter}', ['a', 'b', 'c'], ['a-0', 'b-1', 'c-2', 'a-3'])
  assert.deepEqual(
    classNames,
    ['a-4', 'b-4', 'c-4'],
  )
})

test('render multiple vars with prefix and suffix', () => {
  const classNames = renderForMultiple('my-${contextName}-x', ['a', 'b', 'c'], ['my-a-x', 'my-b-0-x'])
  assert.deepEqual(
    classNames,
    ['my-a-1-x', 'my-b-1-x', 'my-c-1-x'],
  )
})

const maxCounter = 10
const maxRandomRetries = 10

function renderForOne(pattern: string, varNameVariants: string[], existingClassNames: string[]) {
  return renderClassNamesForOneVar(
    varNameVariants,
    {
      pattern: parseClassNamePattern(pattern),
      isUsed: cn => existingClassNames.includes(cn),
      maxCounter,
      maxRandomRetries,
      randomGen: getRandomGen()
    }
  )
}

function renderForMultiple(pattern: string, varsNames: string[], existingClassNames: string[]) {
  return renderClassNamesForMultipleVars(
    varsNames,
    {
      pattern: parseClassNamePattern(pattern),
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

test('match const', () => {
  const pattern = parseClassNamePattern('a')
  assert(
    classNameMatchesPattern('a', 'x', pattern)
  )
  assert(
    !classNameMatchesPattern('b', 'x', pattern)
  )
})

test('match with implicit counter', () => {
  const pattern = parseClassNamePattern('ab')
  assert(
    classNameMatchesPattern('ab-23', 'x', pattern)
  )
  assert(
    !classNameMatchesPattern('ab23', 'x', pattern)
  )
})

test('match with custom placeholder', () => {
  const pattern = parseClassNamePattern('ab${my}cd')
  assert(
    classNameMatchesPattern('ab${my}cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPattern('abmycd', 'x', pattern)
  )
})

test('match with explicit counter', () => {
  const pattern = parseClassNamePattern('ab${counter}cd')
  assert(
    classNameMatchesPattern('ab23cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPattern('ab-23cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPattern('ab23-cd', 'x', pattern)
  )
})

test('match with random', () => {
  const pattern = parseClassNamePattern('ab-${random(3)}-cd')
  assert(
    classNameMatchesPattern('ab-a12-cd', 'x', pattern)
  )
  assert(
    classNameMatchesPattern('ab-1ab-cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPattern('ab-abcd-cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPattern('ab-ab-cd', 'x', pattern)
  )
})

test('match simple contextName', () => {
  const pattern = parseClassNamePattern('${contextName}')
  assert(
    classNameMatchesPattern('a', 'ab', pattern)
  )
  assert(
    classNameMatchesPattern('ab', 'ab', pattern)
  )
  assert(
    !classNameMatchesPattern('b', 'ab', pattern)
  )
})

test('match multiple-component contextName', () => {
  const pattern = parseClassNamePattern('${contextName}')
  const contextName = 'abCd_efg'
  assert(
    classNameMatchesPattern('a-eg', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('ab-ef', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('ab-efg', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('a-c', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('ab-c-ef', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('cd-e', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('cd-eg', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('a', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('c', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('e', contextName, pattern)
  )

  assert(
    classNameMatchesPattern('a-11', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('c-09', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('a-e-43', contextName, pattern)
  )

  assert(
    !classNameMatchesPattern('c-a', contextName, pattern)
  )
  assert(
    !classNameMatchesPattern('a-b', contextName, pattern)
  )
  assert(
    !classNameMatchesPattern('bc', contextName, pattern)
  )
})

test('match uppercase', () => {
  const pattern = parseClassNamePattern('${contextName}')
  const contextName = 'AbCd_EF'

  assert(
    classNameMatchesPattern('ab-cd-ef', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('Ab-Cd-EF', contextName, pattern)
  )
  assert(
    classNameMatchesPattern('A-C-E', contextName, pattern)
  )
})

test('match contextName with explicit counter', () => {
  const pattern = parseClassNamePattern('${contextName}-${counter}')
  assert(
    classNameMatchesPattern('a-cd-023', 'ab-cd', pattern)
  )
})

test('match contextName with impl counter and suffix', () => {
  const pattern = parseClassNamePattern('${contextName}-89')
  assert(
    classNameMatchesPattern('c-1-89', 'cd-12', pattern)
  )
  assert(
    classNameMatchesPattern('c-1-89-89', 'cd-12', pattern)
  )
  assert(
    !classNameMatchesPattern('c-1-89-90', 'cd-12', pattern)
  )
})

test('match contextName with counter suffix prefix', () => {
  const pattern = parseClassNamePattern('ab-${contextName}-89-${counter}x')
  assert(
    classNameMatchesPattern('ab-c-1-89-023x', 'cd-12', pattern)
  )
  assert(
    !classNameMatchesPattern('ab-c12-89-023x', 'cd-12', pattern)
  )
})

test('match contextName with counter and random', () => {
  const pattern = parseClassNamePattern('a${randomAlpha(3)}-${contextName}-${randomNumeric(2)}0')
  assert(
    classNameMatchesPattern('aaaa-c-890', 'cd-12', pattern)
  )
  assert(
    !classNameMatchesPattern('aaaa-c-089', 'cd-12', pattern)
  )
  assert(
    !classNameMatchesPattern('Aaaa-c-890', 'cd-12', pattern)
  )
})

test.run()
