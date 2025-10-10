import { type MarkupDiagnostic, parseMarkup } from './markupParser.ts'
import { test } from '../testUtil/test.mjs'
import assert from 'node:assert'

test('empty', () => {
  assert.deepEqual([...parseMarkup('', '')], [])
})

test('dup', () => {
  assert.deepEqual(
    [...parseMarkup('a', 'duplicate()')],
    [
      {
        code: 2300,
        messageText: "Duplicate name 'a'.",
        related: [],
        fixes: [],
        skipFixes: false,
      } satisfies MarkupDiagnostic,
    ]
  )
})

test('dup links fixes', () => {
  assert.deepEqual(
    [...parseMarkup('b', 'duplicate(alsoDeclared(../index.ts, 0) alsoDeclared(,2) fix(b-1))')],
    [
      {
        code: 2300,
        messageText: "Duplicate name 'b'.",
        related: [
          {
            code: 6203,
            messageText: `'b' was also declared here.`,
            file: '../index.ts',
            regionIndex: 0,
          },
          {
            code: 6203,
            messageText: `'b' was also declared here.`,
            file: undefined,
            regionIndex: 2,
          }
        ],
        fixes: [
          {
            newText: 'b-1',
            description: "Change 'b' to 'b-1'",
          }
        ],
        skipFixes: false,
      } satisfies MarkupDiagnostic,
    ]
  )
})

test('dup and unused', () => {
  assert.deepEqual(
    [...parseMarkup('xxx', "duplicate(msg('a-b')) unused()")],
    [
      {
        code: 2300,
        messageText: "Duplicate name 'a-b'.",
        related: [],
        fixes: [],
        skipFixes: false,
      },
      {
        code: 0,
        messageText: 'Unused class name.',
        related: [],
        fixes: [],
        skipFixes: false,
      }
    ] satisfies MarkupDiagnostic[],
  )
})

test('has no element', () => {
  assert.deepEqual(
    [...parseMarkup('a', `tupleHasNoElement(msg('["a", "b"]', 2, 3))`)],
    [
      {
        code: 2493,
        messageText: `Tuple type '["a", "b"]' of length '2' has no element at index '3'.`,
        related: [],
        fixes: [],
        skipFixes: false,
      } satisfies MarkupDiagnostic,
    ]
  )
})

test('does not satisfy', () => {
 assert.deepEqual(
   [...parseMarkup('a', "doesNotSatisfy()")],
   [
    {
      code: 2344,
      messageText: "The name 'a' does not satisfy the pattern '${contextName}'.",
      related: [],
      fixes: [],
      skipFixes: false,
    }
   ] satisfies MarkupDiagnostic[],
 )
})

test('does not satisfy with msg link and fix', () => {
 assert.deepEqual(
   [...parseMarkup('a', "doesNotSatisfy(msg(, '${contextName}-${random(3)}') contextNameEvaluatedTo(,,'b/c/d') fix('a-y7A'))")],
   [
    {
      code: 2344,
      messageText: "The name 'a' does not satisfy the pattern '${contextName}-${random(3)}'.",
      related: [{
        code: 0,
        messageText: `Context name evaluated to 'b/c/d'.`,
        file: undefined,
        regionIndex: undefined,
      }],
      fixes: [
        {
          newText: 'a-y7A',
          description: "Change 'a' to 'a-y7A'",
        }
      ],
      skipFixes: false,
    }
   ] satisfies MarkupDiagnostic[],
 )
})

test('skip fixes', () => {
 assert.deepEqual(
   [...parseMarkup('a', "doesNotSatisfy(skipFixes())")],
   [
    {
      code: 2344,
      messageText: "The name 'a' does not satisfy the pattern '${contextName}'.",
      related: [],
      fixes: [],
      skipFixes: true,
    }
   ] satisfies MarkupDiagnostic[],
 )
})
