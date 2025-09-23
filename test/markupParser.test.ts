import { type MarkupDiagnostic, parseMarkup } from './markupParser.ts'
import { test } from 'uvu'
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
        messageText: "Duplicate class name 'a'.",
        related: [],
        fixes: [],
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
        messageText: "Duplicate class name 'b'.",
        related: [
          {
            code: 6203,
            messageText: `'b' was also declared here.`,
            file: '../index.ts',
            diagnosticIndex: 0,
          },
          {
            code: 6203,
            messageText: `'b' was also declared here.`,
            file: undefined,
            diagnosticIndex: 2,
          }
        ],
        fixes: [
          {
            newText: 'b-1',
            description: "Change 'b' to 'b-1'",
          }
        ],
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
        messageText: "Duplicate class name 'a-b'.",
        related: [],
        fixes: [],
      },
      {
        code: 0,
        messageText: 'Unused class name.',
        related: [],
        fixes: [],
      }
    ]
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
      },
    ]
  )
})

/*
  contextNameEvaluatedTo: (contextName: string) => ({
    code: 0,
    messageText: `Context name evaluated to '${contextName}'.`,
  }),
*/
test('does not satisfy', () => {
 assert.deepEqual(
   [...parseMarkup('a', "doesNotSatisfy(msg(, '${contextName}-${random(3)}') contextNameEvaluatedTo(,,'b/c/d') fix('a-y7A'))")],
   [
    {
      code: 2344,
      messageText: "Class name 'a' does not satisfy the pattern '${contextName}-${random(3)}'.",
      related: [{
        code: 0,
        messageText: `Context name evaluated to 'b/c/d'.`,
        file: undefined,
        diagnosticIndex: 0,
      }],
      fixes: [
        {
          newText: 'a-y7A',
          description: "Change 'a' to 'a-y7A'",
        }
      ],
    }
   ] satisfies MarkupDiagnostic[],
 )
})
test.run()
