import assert from 'node:assert'
import {test} from '../testUtil/test.mjs'
import { getComments } from './getComments.ts'

test('getComments empty', () => {
  assert.deepStrictEqual(
    [...getComments([''])],
    []
  )
})

test('getComments no comments', () => {
  assert.deepStrictEqual(
    [...getComments(['ab \n\n cd'])],
    []
  )
})

test('getComments one', () => {
  assert.deepStrictEqual(
    [...getComments(['ab /* cd */ ef'])],
    [{ start: { line: 0, character: 3 }, end: { line: 0, character: 11 }, innerText: ' cd ' }]
  )
})

test('getComments one whole line', () => {
  assert.deepStrictEqual(
    [...getComments(['ab', '/* cd */', 'ef'])],
    [{ start: { line: 1, character: 0 }, end: { line: 1, character: 8 }, innerText: ' cd ' }]
  )
})

test('getComments several', () => {
  assert.deepStrictEqual(
    [...getComments(['ab /*cd*/', 'ef', '/*gh*/ef/*ij*/kl'])],
    [
      { start: { line: 0, character: 3 }, end: { line: 0, character: 9 }, innerText: 'cd' },
      { start: { line: 2, character: 0 }, end: { line: 2, character: 6 }, innerText: 'gh' },
      { start: { line: 2, character: 8 }, end: { line: 2, character: 14 }, innerText: 'ij' },
    ]
  )
})
