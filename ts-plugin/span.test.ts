import { test } from '../testUtil/test.mjs'
import assert from 'node:assert'
import { areSpansIntersecting, type Span } from './span'

test('equal', () => {
  assert(intersecting(s(2, 24, 2, 27), s(2, 24, 2, 27)))
})

test('same line', () => {
  assert(intersecting(s(0, 0, 0, 3), s(0, 1, 0, 2)))
})

test('same line not', () => {
  assert(!intersecting(s(0, 0, 0, 1), s(0, 2, 0, 3)))
})

test('single line before multiline', () => {
  assert(intersecting(s(0, 0, 0, 3), s(0, 2, 1, 0)))
})

test('single line before multiline not', () => {
  assert(!intersecting(s(0, 0, 0, 1), s(0, 2, 1, 0)))
})

test('single line after multiline not', () => {
  assert(intersecting(s(0, 0, 1, 3), s(1, 2, 1, 4)))
})

test('single line after multiline not', () => {
  assert(!intersecting(s(0, 0, 1, 1), s(1, 2, 1, 4)))
})

test('multiline and multiline', () => {
  assert(intersecting(s(0, 0, 1, 3), s(1, 2, 3, 4)))
})

test('multiline and multiline not', () => {
  assert(!intersecting(s(0, 0, 1, 1), s(1, 2, 3, 4)))
})

// *** Util ***

function intersecting(s: Span, t: Span) {
  const r0 = areSpansIntersecting(s, t)
  const r1 = areSpansIntersecting(t, s)
  assert(r0 === r1, `Different result for ${JSON.stringify(s)} and ${JSON.stringify(t)}`)
  return r0
}

function s(l0: number, c0: number, l1: number, c1: number): Span {
  return {
    start: {line: l0, character: c0},
    end: {line: l1, character: c1},
  }
}
