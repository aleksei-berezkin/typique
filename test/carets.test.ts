import {test} from '../testUtil/test.mjs'
import assert from 'node:assert'
import { getCarets, toMyTestCompletions } from './carets.ts'

test('simple', () => {
  assert.deepStrictEqual(
    [...getCarets('x\naa /*  |>*/ bb')],
    [{caret: {line: 1, character: 11}, completionItems: [], operator: '(eq)'}]
  )
})

test('with caret', () => {
  assert.deepStrictEqual(
    [...getCarets('/*|>,12*/')],
    [{caret: {line: 0, character: 21}, completionItems: [], operator: '(eq)'}]
  )
})

test('with caret toMyTestCompletions', () => {
  const caret = getCarets('/* ab |>,12*/').next().value!
  const myCompletions = toMyTestCompletions(caret)
  assert.deepStrictEqual(
    myCompletions,
    [{ name: 'ab'}]
  )
})

test('with spanStart', () => {
  assert.deepStrictEqual(
    [...getCarets('/*|>1,12*/')],
    [{spanStart: {line: 0, character: 11}, caret: {line: 0, character: 22}, completionItems: [], operator: '(eq)'}]
  )
})

test('with spanEnd', () => {
  assert.deepStrictEqual(
    [...getCarets('/*|>,12,13*/')],
    [{caret: {line: 0, character: 24}, spanEnd: {line: 0, character: 25}, completionItems: [], operator: '(eq)'}]
  )
})

test('with span', () => {
  assert.deepStrictEqual(
    [...getCarets('/*|>11,12,13*/')],
    [{spanStart: {line: 0, character: 25}, caret: {line: 0, character: 26}, spanEnd: {line: 0, character: 27}, completionItems: [], operator: '(eq)'}]
  )
})

test('several', () => {
  assert.deepStrictEqual(
    [...getCarets('abc /* ab |>,2*/ def /* (eq) cd |>*/ ghi')],
    [
      {caret: {line: 0, character: 18}, completionItems: ['ab'], operator: '(eq)'},
      {caret: {line: 0, character: 36}, completionItems: ['cd'], operator: '(eq)'},
    ]
  )
})

test('items', () => {
  assert.deepStrictEqual(
    [...getCarets('aaa /* (includes) ab  cd ef |>*/ bbb /* (includes-not) "a, b" "c, d" |>*/ ccc')],
    [
      {caret: {line: 0, character: 32}, completionItems: ['ab', 'cd', 'ef'], operator: '(includes)'},
      {caret: {line: 0, character: 73}, completionItems: ['a, b', 'c, d'], operator: '(includes-not)'},
    ]
  )
})
