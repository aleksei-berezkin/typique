import { test } from '../testUtil/test.mjs'
import assert from 'node:assert'
import { camelCaseToKebabCase, findClassNameProtectedRanges, getIntStrLen, padZeros, replaceExtensionWithCss } from './util'

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

test('padZeros', () => {
  assert.equal(padZeros(0, 0), '0')
  assert.equal(padZeros(0, 10), '00')
  assert.equal(padZeros(0, 999), '000')
  assert.equal(padZeros(1, 0), '1')
  assert.equal(padZeros(2, 10), '02')
  assert.equal(padZeros(34, 9998), '0034')
  assert.equal(padZeros(11, 0), '11')
  assert.equal(padZeros(222, 1), '222')
  assert.equal(padZeros(333, 999), '333')
})

test('getIntStrLen', () => {
  assert.equal(getIntStrLen(0), 1)
  assert.equal(getIntStrLen(1), 1)
  assert.equal(getIntStrLen(9), 1)
  assert.equal(getIntStrLen(10), 2)
  assert.equal(getIntStrLen(999), 3)

  assert.equal(getIntStrLen(-1), 2)
  assert.equal(getIntStrLen(-9), 2)
  assert.equal(getIntStrLen(-99), 3)
  assert.equal(getIntStrLen(-998), 4)
})

test('replaceExtensionWithCss', () => {
  assert.equal(replaceExtensionWithCss('a'), 'a.css')
  assert.equal(replaceExtensionWithCss('a.ts'), 'a.css')
  assert.equal(replaceExtensionWithCss('a.ts/b'), 'a.ts/b.css')
  assert.equal(replaceExtensionWithCss('a.ts/b.ts'), 'a.ts/b.css')
})
