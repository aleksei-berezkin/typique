import { test } from '../testUtil/test.mjs'
import assert from 'node:assert'
import { getNamePayloadIfMatches, getNameVariants, splitName } from './names'

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
    getNameVariants(''),
    [],
  )
})

test('getNameVariants single', () => {
  assert.deepEqual(
    getNameVariants('ab'),
    ['ab'],
  )
})

test('getNameVariants simple', () => {
  assert.deepEqual(
    getNameVariants('loggedIn_UserName'),
    ['logged-in-user-name', 'in-user-name', 'user-name', 'name'],
  )
})

test('splitName empty', () => {
  assert.deepEqual(
    splitName(''),
    [],
  )
})

test('splitName oneChar', () => {
  assert.deepEqual(
    splitName('a'),
    ['a'],
  )
})

test('splitName one str', () => {
  assert.deepEqual(
    splitName('ab01'),
    ['ab01'],
  )
})

test('splitName no', () => {
  assert.deepEqual(
    splitName('--__'),
    [],
  )
})

test('splitName camelCase', () => {
  assert.deepEqual(
    splitName('abCd'),
    ['ab', 'cd'],
  )
})

test('splitName Snake_Case', () => {
  assert.deepEqual(
    splitName('Ab_Cd1_e2f'),
    ['ab', 'cd1', 'e2f'],
  )
})

test('splitName leading', () => {
  assert.deepEqual(
    splitName('__abCd'),
    ['ab', 'cd'],
  )
})

test('splitName trailing', () => {
  assert.deepEqual(
    splitName('abCd__'),
    ['ab', 'cd'],
  )
})

test('splitName case and underscode', () => {
  assert.deepEqual(
    splitName('AbCd_EF'),
    ['ab', 'cd', 'ef'],
  )
})

