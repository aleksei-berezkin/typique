import {test} from '../testUtil/test.mjs'
import assert from 'node:assert'
import {binSearchLine, getLineStartOffsets} from './offsetToLineAndChar.ts'

test('getLineStartOffsets empty', () => {
  assert.deepStrictEqual(
    getLineStartOffsets(''),
    []
  )
})

test('getLineStartOffsets single', () => {
  assert.deepStrictEqual(
    getLineStartOffsets('a'),
    [0],
  )
})

test('getLineStartOffsets one', () => {
  assert.deepStrictEqual(
    getLineStartOffsets('ab'),
    [0],
  )
})


test('getLineStartOffsets one with trailing newline', () => {
  assert.deepStrictEqual(
    getLineStartOffsets('ab\n'),
    [0],
  )
})

test('getLineStartOffsets one with two trailing newlines', () => {
  assert.deepStrictEqual(
    getLineStartOffsets('ab\n\n'),
    [0, 3],
  )
})

test('getLineStartOffsets one with leading newline', () => {
  assert.deepStrictEqual(
    getLineStartOffsets('\nab'),
    [0, 1],
  )
})

test('getLineStartOffsets one with two leading newlines', () => {
  assert.deepStrictEqual(
    getLineStartOffsets('\n\nab'),
    [0, 1, 2],
  )
})

test('getLineStartOffsets two', () => {
  assert.deepStrictEqual(
    getLineStartOffsets('ab\ncd'),
    [0, 3],
  )
})

test('getLineStartOffsets two with multiple in the mid', () => {
  assert.deepStrictEqual(
    getLineStartOffsets('ab\n\n\nde'),
    [0, 3, 4, 5],
  )
})

test('getLineStartOffsets multiple', () => {
  assert.deepStrictEqual(
    getLineStartOffsets('\nab\n\nd\nde\n\n'),
    [0, 1, 4, 5, 7, 10],
  )
})

test('binSearch single', () => {
  assert.equal(
    0,
    binSearchLine([0], 0)
  )
  assert.equal(
    0,
    binSearchLine([0], 10)
  )
})

test('binSearch two', () => {
  assert.equal(
    0,
    binSearchLine([0, 10], 0)
  )
  assert.equal(
    0,
    binSearchLine([0, 10], 5)
  )
  assert.equal(
    1,
    binSearchLine([0, 10], 10)
  )
  assert.equal(
    1,
    binSearchLine([0, 10], 15)
  )
})

test('binSearch three', () => {
  assert.equal(
    0,
    binSearchLine([0, 10, 20], 0)
  )
  assert.equal(
    0,
    binSearchLine([0, 10, 20], 5)
  )
  assert.equal(
    1,
    binSearchLine([0, 10, 20], 10)
  )
  assert.equal(
    1,
    binSearchLine([0, 10, 20], 15)
  )
  assert.equal(
    2,
    binSearchLine([0, 10, 20], 20)
  )
  assert.equal(
    2,
    binSearchLine([0, 10, 20], 25)
  )
})

test('binSearch four', () => {
  assert.equal(
    0,
    binSearchLine([0, 10, 20, 30], 0)
  )
  assert.equal(
    0,
    binSearchLine([0, 10, 20, 30], 5)
  )
  assert.equal(
    1,
    binSearchLine([0, 10, 20, 30], 10)
  )
  assert.equal(
    1,
    binSearchLine([0, 10, 20, 30], 15)
  )
  assert.equal(
    2,
    binSearchLine([0, 10, 20, 30], 20)
  )
  assert.equal(
    2,
    binSearchLine([0, 10, 20, 30], 25)
  )
  assert.equal(
    3,
    binSearchLine([0, 10, 20, 30], 30)
  )
  assert.equal(
    3,
    binSearchLine([0, 10, 20, 30], 35)
  )
})
