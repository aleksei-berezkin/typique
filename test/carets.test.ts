import {test} from '../testUtil/test.mjs'
import assert from 'node:assert'
import { getCarets, toMyTestCompletionEntries } from './carets.ts'

test('simple', () => {
  assert.deepStrictEqual(
    [...getCarets('x\naa /*  |>*/ bb')],
    [{caretPos: {line: 1, character: 11}, completionItems: [], operator: '(eq)'}]
  )
})

test('with caret', () => {
  assert.deepStrictEqual(
    [...getCarets('/*|>12*/')],
    [{caretPos: {line: 0, character: 20}, completionItems: [], operator: '(eq)'}]
  )
})

test('with caret toMyTestCompletions', () => {
  const caret = getCarets('/* ab |>12*/').next().value!
  const myCompletions = toMyTestCompletionEntries(caret)
  assert.deepStrictEqual(
    myCompletions,
    [{ name: 'ab'}]
  )
})

test('with span', () => {
  assert.deepStrictEqual(
    [...getCarets('/*|>11,12,13*/')],
    [{
      caretPos: {line: 0, character: 26},
      replacementSpan: {
        start: {line: 0, character: 25},
        end: {line: 0, character: 27},
      },
      completionItems: [],
      operator: '(eq)',
    }]
  )
})

test('with span toMyTestCompletions', () => {
  const caret = getCarets('/* ab |>11,12,13*/').next().value!
  const myCompletions = toMyTestCompletionEntries(caret)
  assert.deepStrictEqual(
    myCompletions,
    [{
      name: 'ab',
      insertText: 'ab',
      replacementSpan: {
        start: {line: 0, character: 29},
        end: {line: 0, character: 31},
      },
    }]
  )
})

test('with span toMyTestCompletions with quotes', () => {
  const caret = getCarets('/* `\'ab\' satisfies` |>0,1,2*/').next().value!
  const myCompletions = toMyTestCompletionEntries(caret)
  assert.deepStrictEqual(
    myCompletions,
    [{
      name: 'ab',
      insertText: '\'ab\' satisfies',
      replacementSpan: {
        start: {line: 0, character: 29},
        end: {line: 0, character: 31},
      },
    }]
  )
})

test('several', () => {
  assert.deepStrictEqual(
    [...getCarets('abc /* ab |>2*/ def /* (eq) cd |>*/ ghi')],
    [
      {caretPos: {line: 0, character: 17}, completionItems: ['ab'], operator: '(eq)'},
      {caretPos: {line: 0, character: 35}, completionItems: ['cd'], operator: '(eq)'},
    ]
  )
})

test('items', () => {
  assert.deepStrictEqual(
    [...getCarets('aaa /* (includes) ab  cd ef |>*/ bbb /* (includes-not) "a, b" "c, d" |>*/ ccc')],
    [
      {caretPos: {line: 0, character: 32}, completionItems: ['ab', 'cd', 'ef'], operator: '(includes)'},
      {caretPos: {line: 0, character: 73}, completionItems: ['a, b', 'c, d'], operator: '(includes-not)'},
    ]
  )
})
