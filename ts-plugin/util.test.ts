import { test } from 'uvu'
import assert from 'node:assert'
import { findClassNameProtectedRanges } from './util'

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
