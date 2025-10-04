import { test } from '../testUtil/test.mjs'
import assert from 'node:assert'
import { getNamePayloadIfMatches, getNameVariants, splitName } from './names'

function getNameVariantsDefault(...contextName: string[]) {
  return getNameVariants({
    type: 'default',
    parts: contextName,
  })
}

function splitNameDefault(...contextName: string[]) {
  return [...splitName({
    type: 'default',
    parts: contextName,
  })]
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

test('getNamePayloadIfMatches empty regex', () => {
  assert.equal(
    getNamePayloadIfMatches('ab', ''),
    'ab',
  )
})

test('getNamePayloadIfMatches prefix with lookahead', () => {
  const regex = '^cn(?=[A-Z_])'
  assert.equal(
    getNamePayloadIfMatches('cnAb', regex),
    'Ab',
  )
  assert.equal(
    getNamePayloadIfMatches('cnt', regex),
    undefined,
  )
})

test('getNamePayloadIfMatches std suffix', () => {
  const regex = 'Class(es)?([Nn]ames?)?$'
  assert.equal(
    getNamePayloadIfMatches('roundBtnClasses', regex),
    'roundBtn',
  )
  assert.equal(
    getNamePayloadIfMatches('userPicClassName', regex),
    'userPic',
  )
  assert.equal(
    getNamePayloadIfMatches('docInfo_Classnames', regex),
    'docInfo_',
  )
  assert.equal(
    getNamePayloadIfMatches('Classname', regex),
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
    ['logged-in-user-name', 'in-user-name', 'user-name', 'name'],
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

