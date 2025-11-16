import {test} from '../testUtil/test.mjs'
import assert from 'node:assert'
import { getCarets, toMyCompletionEntries } from './carets.ts'

test('simple', () => {
  assert.deepStrictEqual(
    [...getCarets(['x', 'aa /*  |>*/ bb'])],
    [{caretPos: {line: 1, character: 11}, completionItems: [], operator: '(eq)'}]
  )
})

test('with caret', () => {
  assert.deepStrictEqual(
    [...getCarets(['/*|>12*/'])],
    [{caretPos: {line: 0, character: 20}, completionItems: [], operator: '(eq)'}]
  )
})

test('with caret toMyCompletions', () => {
  const caret = getCarets(['/* ab |>12*/']).next().value!
  const myCompletions = toMyCompletionEntries(caret)
  assert.deepStrictEqual(
    myCompletions,
    [{ name: 'ab'}]
  )
})

test('with span', () => {
  assert.deepStrictEqual(
    [...getCarets(['/*|>11,12,13*/'])],
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

test('with span toMyCompletions', () => {
  const caret = getCarets(['/* ab |>11,12,13*/']).next().value!
  const myCompletions = toMyCompletionEntries(caret)
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

test('with span toMyCompletions with quotes', () => {
  const caret = getCarets(['/* `\'ab\' satisfies` |>0,1,2*/']).next().value!
  const myCompletions = toMyCompletionEntries(caret)
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
    [...getCarets(['abc /* ab |>2*/ def /* (eq) cd |>*/ ghi'])],
    [
      {caretPos: {line: 0, character: 17}, completionItems: ['ab'], operator: '(eq)'},
      {caretPos: {line: 0, character: 35}, completionItems: ['cd'], operator: '(eq)'},
    ]
  )
})

test('items', () => {
  assert.deepStrictEqual(
    [...getCarets(['aaa /* (includes) ab  cd ef |>*/ bbb /* (includes-not) "a, b" "c, d" |>*/ ccc'])],
    [
      {caretPos: {line: 0, character: 32}, completionItems: ['ab', 'cd', 'ef'], operator: '(includes)'},
      {caretPos: {line: 0, character: 73}, completionItems: ['a, b', 'c, d'], operator: '(includes-not)'},
    ]
  )
})

test('first-eq', () => {
  assert.deepStrictEqual(
    [...getCarets(['/* (first-eq) ab |>*/'])],
    [{
      caretPos: {line: 0, character: 21},
      completionItems: ['ab'],
      operator: '(first-eq)',
    }]
  )
})

test('with codeActions', () => {
  const codeActions = [
    {start: {line: 1, character: 2}, end: {line: 1, character: 2}, newText: 'simple'},
    {start: {line: 3, character: 0}, end: {line: 3, character: 0}, newText: ' spaced '},
  ]
  assert.deepStrictEqual(
    [...getCarets(['/* ab |>*/ cd /* ef |>*/', 'gh/*⬅️ simple */', '/*↙️ " spaced " */'])],
    [
      {caretPos: {line: 0, character: 10}, completionItems: ['ab'], operator: '(eq)', codeActions},
      {caretPos: {line: 0, character: 24}, completionItems: ['ef'], operator: '(eq)', codeActions},
    ]
  )
})
