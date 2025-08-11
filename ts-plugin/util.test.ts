import { test } from 'uvu'
import assert from 'node:assert'
import { camelCaseToKebabCase, findClassNameProtectedRanges } from './util'

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

test.run()
