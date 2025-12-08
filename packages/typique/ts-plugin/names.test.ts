import { test } from '../../../testUtil/test.mjs'
import assert from 'node:assert'
import { getNamePayloadIfMatches, getContextNameVariants, splitName } from './names'

function splitNameDefault(...contextName: string[]) {
  return [...splitName(contextName)]
}

test('getNamePayloadIfMatches empty no match', () => {
  assert.equal(
    getNamePayloadIfMatches('', 'c'),
    undefined,
  )
})

test('getNamePayloadIfMatches no match', () => {
  assert.equal(
    getNamePayloadIfMatches('ab', 'c'),
    undefined,
  )
})

test('getNamePayloadIfMatches empty regexp', () => {
  assert.equal(
    getNamePayloadIfMatches('ab', ''),
    'ab',
  )
})

test('getNamePayloadIfMatches prefix with lookahead', () => {
  const regexp = '^cn(?=[A-Z_])'
  assert.equal(
    getNamePayloadIfMatches('cnAb', regexp),
    'Ab',
  )
  assert.equal(
    getNamePayloadIfMatches('cnt', regexp),
    undefined,
  )
})

test('getNamePayloadIfMatches std suffix', () => {
  const regexp = 'Class(es)?([Nn]ames?)?$'
  assert.equal(
    getNamePayloadIfMatches('roundBtnClasses', regexp),
    'roundBtn',
  )
  assert.equal(
    getNamePayloadIfMatches('userPicClassName', regexp),
    'userPic',
  )
  assert.equal(
    getNamePayloadIfMatches('docInfo_Classnames', regexp),
    'docInfo_',
  )
  assert.equal(
    getNamePayloadIfMatches('Classname', regexp),
    '',
  )
})

test('getNameVariants empty', () => {
  assert.deepEqual(
    getNameVariantsDefault(''),
    [],
  )
})

test('getNameVariants single', () => {
  assert.deepEqual(
    getNameVariantsDefault('ab'),
    ['ab'],
  )
})

test('getNameVariants simple', () => {
  assert.deepEqual(
    getNameVariantsDefault('loggedIn_UserName'),
    ['logged-in-user-name', 'logged-user-name', 'logged-in-name', 'logged-name', 'logged-user', 'logged', 'name'],
  )
})

test('getNameVariants long', () => {
  assert.deepEqual(
    getNameVariantsDefault('roundButton', 'sz', 'lg', 'bld'),
    ['round-button-sz-lg-bld', 'round-button-lg-bld', 'round-button-sz-bld', 'round-button-bld', 'round-button-lg', 'round-button', 'button-bld', 'button', 'round'],
  )
})

function getNameVariantsDefault(...contextNameParts: string[]) {
  return [
    ...getContextNameVariants(contextNameParts.map(part => ({
      sourceKind: 'variableName',
      text: part,
    }))),
  ]
}

test('getNameVariants with tsx', () => {
  const variants = [...getContextNameVariants([
    {
      sourceKind: 'functionName',
      text: 'MyButton',
    },
    {
      sourceKind: 'jsxElementName',
      text: 'div',
    },
    {
      sourceKind: 'jsxElementName',
      text: 'button',
    },
    {
      sourceKind: 'jsxElementName',
      text: 'span',
    },
    {
      sourceKind: 'objectPropertyName',
      text: 'kind',
    },
    {
      sourceKind: 'objectPropertyName',
      text: 'rndMid',
    },
  ])]
  assert.deepStrictEqual(
    variants,
    [
      'my-button-span-kind-rnd-mid',
      'button-span-kind-mid',
      'button-span-kind-rnd',
      'button-span-kind',
      'button-kind-mid',
      'button-kind',
      'button-span',
      'button',
      'kind',
    ]
  )
})

test('splitName empty', () => {
  assert.deepEqual(
    splitNameDefault(''),
    [],
  )
})

test('splitName oneChar', () => {
  assert.deepEqual(
    splitNameDefault('a'),
    ['a'],
  )
})

test('splitName one str', () => {
  assert.deepEqual(
    splitNameDefault('ab01'),
    ['ab01'],
  )
})

test('splitName no', () => {
  assert.deepEqual(
    splitNameDefault('--__'),
    [],
  )
})

test('splitName camelCase', () => {
  assert.deepEqual(
    splitNameDefault('abCd'),
    ['ab', 'cd'],
  )
})

test('splitName Snake_Case', () => {
  assert.deepEqual(
    splitNameDefault('Ab_Cd1_e2f'),
    ['ab', 'cd1', 'e2f'],
  )
})

test('splitName leading', () => {
  assert.deepEqual(
    splitNameDefault('__abCd'),
    ['ab', 'cd'],
  )
})

test('splitName trailing', () => {
  assert.deepEqual(
    splitNameDefault('abCd__'),
    ['ab', 'cd'],
  )
})

test('splitName case and underscode', () => {
  assert.deepEqual(
    splitNameDefault('AbCd_EF'),
    ['ab', 'cd', 'ef'],
  )
})

