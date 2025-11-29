import { test } from '../testUtil/test.mjs'
import assert from 'node:assert'
import { nameMatchesPattern, GeneratedNamePattern, parseGeneratedNamePattern, generateNamesForMultipleVars, generateNamesForOneVar, getLongestWord } from './generateNames'

const maxCounter = 10
const maxRandomRetries = 9

test('empty', () => {
  assert.deepEqual(parseGeneratedNamePattern(''), [])
})

test('const', () => {
  assert.deepEqual(parseGeneratedNamePattern('abc'), ['abc'])
})

test('default', () => {
  assert.deepEqual(parseGeneratedNamePattern('${contextName}'), [{type: 'contextName'}])
})

test('with prefix and suffix', () => {
  assert.deepEqual(parseGeneratedNamePattern('ab-${contextName}_cd'), ['ab-', {type: 'contextName'}, '_cd'])
})

test('with counter', () => {
  assert.deepEqual(parseGeneratedNamePattern('${contextName}-${counter}'), [{type: 'contextName'}, '-', {type: 'counter'}])
})

const alphabetL = Array.from({length: 26}, (_, i) => String.fromCharCode('a'.charCodeAt(0) + i)).join('')
const alphabetU = Array.from({length: 26}, (_, i) => String.fromCharCode('A'.charCodeAt(0) + i)).join('')
const alphabet = alphabetL + alphabetU
const numbers = Array.from({length: 10}, (_, i) => i).join('')

test('with random', () => {
  assert.deepEqual(
    parseGeneratedNamePattern('${contextName}-${random(5)}'),
    [
      {type: 'contextName'},
      '-',
      {type: 'random', n: 5, maxWordLen: 5, possibleChars: {normal: alphabet + numbers, toBreakSimpleWord: alphabetU + numbers, toBreakUppercaseWord: alphabetL + numbers}},
    ],
  )
})

test('with random and maxWordLen', () => {
  assert.deepEqual(
    parseGeneratedNamePattern('hi-${random(5, 3)}'),
    [
      'hi-',
      {type: 'random', n: 5, maxWordLen: 3, possibleChars: {normal: alphabet + numbers, toBreakSimpleWord: alphabetU + numbers, toBreakUppercaseWord: alphabetL + numbers}},
    ]
  )
})

test('with randomAlpha', () => {
  assert.deepEqual(
    parseGeneratedNamePattern('${randomAlpha(3)}_${contextName}'),
    [
      {type: 'random', n: 3, maxWordLen: 3, possibleChars: {normal: alphabet, toBreakSimpleWord: alphabetU, toBreakUppercaseWord: alphabetL}},
      '_',
      {type: 'contextName'}
    ]
  )
})

test('with randomAlpha and maxWordLen', () => {
  assert.deepEqual(
    parseGeneratedNamePattern('${randomAlpha(3, 2)}_suffix'),
    [
      {type: 'random', n: 3, maxWordLen: 2, possibleChars: {normal: alphabet, toBreakSimpleWord: alphabetU, toBreakUppercaseWord: alphabetL}},
      '_suffix',
    ]
  )
})

test('with randomNumeric', () => {
  assert.deepEqual(
    parseGeneratedNamePattern('${randomNumeric(3)}-${contextName}'),
    [
      {type: 'random', n: 3, maxWordLen: 3, possibleChars: {normal: numbers, toBreakSimpleWord: numbers, toBreakUppercaseWord: numbers}},
      '-',
      {type: 'contextName'},
    ]
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

test('random with maxWordLen', () => {
  const [classNameWithLongWords] = renderForOne('${random(24)}', [], [], true)
  const longestWord = getLongestWord(classNameWithLongWords)
  assert.strictEqual(longestWord, 'Qrbey')

  const [classNameWithShortWords] = renderForOne('${random(24, 3)}', [], [], true)
  const longestShortWord = getLongestWord(classNameWithShortWords)
  assert.strictEqual(longestShortWord, 'DBZ')
})

test('randomAlpha with maxWordLen', () => {
  const [classNameWithLongWords] = renderForOne('${randomAlpha(24)}', [], [], true)
  const longestWord = getLongestWord(classNameWithLongWords)
  assert.strictEqual(longestWord, 'Jobdu')
  
  const [classNameWithShortWords] = renderForOne('${randomAlpha(24, 3)}', [], [], true)
  const longestShortWord = getLongestWord(classNameWithShortWords)
  assert.strictEqual(longestShortWord, 'GXY')
})

function renderForOne(pattern: string, varNameVariants: string[], existingClassNames: string[], longerWords: boolean = false) {
  return generateNamesForOneVar(
    varNameVariants,
    {
      pattern: parseGeneratedNamePattern(pattern),
      isUsed: cn => existingClassNames.includes(cn),
      maxCounter,
      maxRandomRetries,
      getRandom: getGetRandom(longerWords)
    }
  )
}

function renderForMultiple(pattern: string, varsNames: string[], existingClassNames: string[]) {
  return generateNamesForMultipleVars(
    varsNames,
    {
      pattern: parseGeneratedNamePattern(pattern),
      isUsed: cn => existingClassNames.includes(cn),
      maxCounter,
      maxRandomRetries,
      getRandom: getGetRandom(false)
    }
  )
}

function getGetRandom(longerWords: boolean) {
  const randomGen = (function* () {
    for (let i = 0; ; i++)
      yield (Math.sin(2000 + i * (longerWords ? 10_002 : 10_000)) + 1) / 2
  })()
  return () => randomGen.next().value
}

function classNameMatchesPatternDefault(className: string, contextName: string, pattern: GeneratedNamePattern) {
  return nameMatchesPattern(className, [{sourceKind: 'variableName',text: contextName}], pattern)
}

test('match const', () => {
  const pattern = parseGeneratedNamePattern('a')
  assert(
    classNameMatchesPatternDefault('a', 'x', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('b', 'x', pattern)
  )
})

test('match with implicit counter', () => {
  const pattern = parseGeneratedNamePattern('ab')
  assert(
    classNameMatchesPatternDefault('ab-23', 'x', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('ab23', 'x', pattern)
  )
})

test('match with custom placeholder', () => {
  const pattern = parseGeneratedNamePattern('ab${my}cd')
  assert(
    classNameMatchesPatternDefault('ab${my}cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('abmycd', 'x', pattern)
  )
})

test('match with explicit counter', () => {
  const pattern = parseGeneratedNamePattern('ab${counter}cd')
  assert(
    classNameMatchesPatternDefault('ab23cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('ab-23cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('ab23-cd', 'x', pattern)
  )
})

test('match with random', () => {
  const pattern = parseGeneratedNamePattern('ab-${random(3)}-cd')
  assert(
    classNameMatchesPatternDefault('ab-a12-cd', 'x', pattern)
  )
  assert(
    classNameMatchesPatternDefault('ab-1ab-cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('ab-abcd-cd', 'x', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('ab-ab-cd', 'x', pattern)
  )
})

test('match simple contextName', () => {
  const pattern = parseGeneratedNamePattern('${contextName}')
  assert(
    classNameMatchesPatternDefault('a', 'ab', pattern)
  )
  assert(
    classNameMatchesPatternDefault('ab', 'ab', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('b', 'ab', pattern)
  )
})

test('match multiple-component contextName', () => {
  const pattern = parseGeneratedNamePattern('${contextName}')
  const contextName = 'abCd_efg'
  assert(
    classNameMatchesPatternDefault('a-eg', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('ab-ef', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('ab-efg', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('a-c', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('ab-c-ef', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('cd-e', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('cd-eg', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('a', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('c', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('e', contextName, pattern)
  )

  assert(
    classNameMatchesPatternDefault('a-11', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('c-09', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('a-e-43', contextName, pattern)
  )

  assert(
    !classNameMatchesPatternDefault('c-a', contextName, pattern)
  )
  assert(
    !classNameMatchesPatternDefault('a-b', contextName, pattern)
  )
  assert(
    !classNameMatchesPatternDefault('bc', contextName, pattern)
  )
})

test('match uppercase', () => {
  const pattern = parseGeneratedNamePattern('${contextName}')
  const contextName = 'AbCd_EF'

  assert(
    classNameMatchesPatternDefault('ab-cd-ef', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('Ab-Cd-EF', contextName, pattern)
  )
  assert(
    classNameMatchesPatternDefault('A-C-E', contextName, pattern)
  )
})

test('match contextName with explicit counter', () => {
  const pattern = parseGeneratedNamePattern('${contextName}-${counter}')
  assert(
    classNameMatchesPatternDefault('a-cd-023', 'ab-cd', pattern)
  )
})

test('match contextName with impl counter and suffix', () => {
  const pattern = parseGeneratedNamePattern('${contextName}-89')
  assert(
    classNameMatchesPatternDefault('c-1-89', 'cd-12', pattern)
  )
  assert(
    classNameMatchesPatternDefault('c-1-89-89', 'cd-12', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('c-1-89-90', 'cd-12', pattern)
  )
})

test('match contextName with counter suffix prefix', () => {
  const pattern = parseGeneratedNamePattern('ab-${contextName}-89-${counter}x')
  assert(
    classNameMatchesPatternDefault('ab-c-1-89-023x', 'cd-12', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('ab-c12-89-023x', 'cd-12', pattern)
  )
})

test('match contextName with counter and random', () => {
  const pattern = parseGeneratedNamePattern('a${randomAlpha(3)}-${contextName}-${randomNumeric(2)}0')
  assert(
    classNameMatchesPatternDefault('aaaa-c-890', 'cd-12', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('aaaa-c-089', 'cd-12', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('Aaaa-c-890', 'cd-12', pattern)
  )
})

test('getLongestWord', () => {
  assert.strictEqual(getLongestWord(''), undefined)
  assert.strictEqual(getLongestWord('1'), undefined)
  assert.strictEqual(getLongestWord('a'), 'a')
  assert.strictEqual(getLongestWord('ab'), 'ab')
  assert.strictEqual(getLongestWord('aC'), 'C')
  assert.strictEqual(getLongestWord('abCd'), 'Cd')
  assert.strictEqual(getLongestWord('ab1cd'), 'cd')
  assert.strictEqual(getLongestWord('abc1cd'), 'abc')
  assert.strictEqual(getLongestWord('AbCDEf'), 'CDE')
  assert.strictEqual(getLongestWord('ABCDef'), 'ABCD')
})

test('match random with maxWordLen', () => {
  const pattern = parseGeneratedNamePattern('${random(6, 3)}')
  assert(
    classNameMatchesPatternDefault('abc33d', '', pattern)
  )
  assert(
    classNameMatchesPatternDefault('abcDef', '', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('ABCDef', '', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('abcd33', '', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('Abcd33', '', pattern)
  )
})

test('match randomAlpha with maxWordLen', () => {
  const pattern = parseGeneratedNamePattern('${randomAlpha(6, 3)}')
  assert(
    classNameMatchesPatternDefault('abcDef', '', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('ABCDef', '', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('abcdEF', '', pattern)
  )
  assert(
    !classNameMatchesPatternDefault('AbcdEf', '', pattern)
  )
})

test('match context and random with masWordLen', () => {
  const pattern = parseGeneratedNamePattern('${contextName}_${random(8, 3)}')
  assert(
    classNameMatchesPatternDefault('app-h1_61sggRhq', 'app-h1', pattern)
  )
})
