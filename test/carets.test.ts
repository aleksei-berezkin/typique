import {test} from '../testUtil/test.mjs'
import assert from 'node:assert'
import { getCarets } from './carets.ts'

test('simple', () => {
  assert.deepStrictEqual(
    [...getCarets('x\naa /*  |>*/ bb')],
    [{line: 1, pos: 11, completionItems: [], operator: '(eq)'}]
  )
})

test('with offset', () => {
  assert.deepStrictEqual(
    [...getCarets('/*|>12*/')],
    [{line: 0, pos: 20, completionItems: [], operator: '(eq)'}]
  )
})

test('several', () => {
  assert.deepStrictEqual(
    [...getCarets('abc /* ab |>2*/ def /* (eq) cd |>*/ ghi')],
    [
      {line: 0, pos: 17, completionItems: ['ab'], operator: '(eq)'},
      {line: 0, pos: 35, completionItems: ['cd'], operator: '(eq)'},
    ]
  )
})

test('items', () => {
  assert.deepStrictEqual(
    [...getCarets('aaa /* (includes) ab  cd ef |>*/ bbb /* (includes-not) "a, b" "c, d" |>*/ ccc')],
    [
      {line: 0, pos: 32, completionItems: ['ab', 'cd', 'ef'], operator: '(includes)'},
      {line: 0, pos: 73, completionItems: ['a, b', 'c, d'], operator: '(includes-not)'},
    ]
  )
})
