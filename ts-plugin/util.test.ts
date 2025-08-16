import { test } from 'uvu'
import assert from 'node:assert'
import { camelCaseToKebabCase, findClassNameProtectedRanges, getNameCompletions, getNamePayload, getNamePayloadIfMatches } from './util'
import { get } from 'node:http'

test('empty str', () => {
  const e = findClassNameProtectedRanges('')
  assert.deepEqual(e, [])
})

test('no ranges', () => {
  const e = findClassNameProtectedRanges('foo (bar) "" \'\' url url() url( )')
  assert.deepEqual(e, [])
})

test('strings and urls', () => {
  const input = 'url("a.s") url(\'b.s\') "c.s" \'d.s\' url(e.s)'
  const ranges = findClassNameProtectedRanges(input)
  const [a, b, c, d, e] = ['"a.s"', '\'b.s\'', '"c.s"', '\'d.s\'', 'url(e.s)']
    .map((s) => input.indexOf(s))
  assert.deepEqual(ranges, [
    [a, a + 5],
    [b, b + 5],
    [c, c + 5],
    [d, d + 5],
    [e, e + 8],
  ])
})

test('escaped strings', () => {
  const ranges = findClassNameProtectedRanges(
    ' " \\n \\\"" \'\\t\\\' \''
  )
  assert.deepEqual(
    ranges,
    [[1, 9], [10, 17]]
  )
})

test('camelCase no match', () => {
  assert.equal(
    camelCaseToKebabCase('abc'),
    'abc',
  )
})

test('camelCase simple', () => {
  assert.equal(
    camelCaseToKebabCase('abCd01d_e'),
    'ab-cd01d_e',
  )
})

test('camelCase Uppercase', () => {
  assert.equal(
    camelCaseToKebabCase('AbCd'),
    '-ab-cd',
  )
})

test('camelCase ABC', () => {
  assert.equal(
    camelCaseToKebabCase('ABC'),
    '-a-b-c',
  )
})

test('camelCase no match because of dash', () => {
  assert.equal(
    camelCaseToKebabCase('a-bcDe'),
    'a-bcDe',
  )
})

test('camelCase no match because of spaces', () => {
  assert.equal(
    camelCaseToKebabCase(' bcDe'),
    ' bcDe',
  )
})

test('getNameCompletions empty', () => {
  assert.deepEqual(
    getNameCompletions('', ''),
    [],
  )
})

test('getNameCompletions no', () => {
  assert.deepEqual(
    getNameCompletions('ab', 'c'),
    [],
  )
})

test('getNameCompletions simple', () => {
  assert.deepEqual(
    getNameCompletions('loggedIn_UserNameClass', 'Class$'),
    ['logged-in-user-name', 'in-user-name', 'user-name', 'name'],
  )
})

test('getNamePayloadIfMatches empty', () => {
  assert.deepEqual(
    getNamePayloadIfMatches('', ''),
    [],
  )
})

test('getNamePayloadIfMatches no match', () => {
  assert.deepEqual(
    getNamePayloadIfMatches('ab', 'c'),
    [],
  )
})

test('getNamePayloadIfMatches empty regex', () => {
  assert.deepEqual(
    getNamePayloadIfMatches('ab', ''),
    ['ab'],
  )
})

test('getNamePayloadIfMatches prefix with lookahead', () => {
  const regex = '^cn(?=[A-Z_])'
  assert.deepEqual(
    getNamePayloadIfMatches('cnAb', regex),
    ['ab'],
  )
  assert.deepEqual(
    getNamePayloadIfMatches('cnt', regex),
    [],
  )
})

test('getNamePayloadIfMatches std suffix', () => {
  const regex = 'Class([Nn]ame)?$'
  assert.deepEqual(
    getNamePayloadIfMatches('roundBtnClass', regex),
    ['round', 'btn'],
  )
  assert.deepEqual(
    getNamePayloadIfMatches('userPicClassName', regex),
    ['user', 'pic'],
  )
  assert.deepEqual(
    getNamePayloadIfMatches('docInfo_Classname', regex),
    ['doc', 'info'],
  )
  assert.deepEqual(
    getNamePayloadIfMatches('Classname', regex),
    [],
  )
})

test('getNamePayload empty', () => {
  assert.deepEqual(
    getNamePayload(''),
    [],
  )
})

test('getNamePayload oneChar', () => {
  assert.deepEqual(
    getNamePayload('a'),
    ['a'],
  )
})

test('getNamePayload one str', () => {
  assert.deepEqual(
    getNamePayload('ab01'),
    ['ab01'],
  )
})

test('getNamePayload no', () => {
  assert.deepEqual(
    getNamePayload('--__'),
    [],
  )
})

test('getNamePayload camelCase', () => {
  assert.deepEqual(
    getNamePayload('abCd'),
    ['ab', 'cd'],
  )
})

test('getNamePayload Snake_Case', () => {
  assert.deepEqual(
    getNamePayload('Ab_Cd1_e2f'),
    ['ab', 'cd1', 'e2f'],
  )
})

test.run()
