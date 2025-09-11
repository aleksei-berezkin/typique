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
        links: [],
        fixes: [],
      } satisfies MarkupDiagnostic,
    ]
  )
})

test('dup links fixes', () => {
  assert.deepEqual(
    [...parseMarkup('b', 'duplicate(link(../index.ts, 0) link(,2) fix(b-1))')],
    [
      {
        code: 2300,
        messageText: "Duplicate class name 'b'.",
        links: [
          {
            file: '../index.ts',
            fragmentIndex: 0,
          },
          {
            file: undefined,
            fragmentIndex: 2,
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
        links: [],
        fixes: [],
      },
      {
        code: 0,
        messageText: 'Unused class name.',
        links: [],
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
        links: [],
        fixes: [],
      },
    ]
  )
})

test('does not satisfy', () => {
 assert.deepEqual(
   [...parseMarkup('a', "doesNotSatisfy(msg(, '${varName}-${random(3)}') fix('a-y7A'))")],
   [
    {
      code: 2344,
      messageText: "Class name 'a' does not satisfy the pattern '${varName}-${random(3)}'.",
      links: [],
      fixes: [
        {
          newText: 'a-y7A',
          description: "Change 'a' to 'a-y7A'",
        }
      ],
    }
   ],
 )
})
test.run()
