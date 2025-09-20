import {test} from 'uvu'
import assert from 'node:assert'
import { classNameReferenceRegExp, getUnusedClassNames, pathToReference, referenceToPath, resolveClassNameReference, unfold, unfoldWithPath, type ClassNameAndSpans } from './classNameAndSpans'

test('unfold resolve empty', () => {
  const classNameAndSpans: ClassNameAndSpans = {
    type: 'empty',
  }
  assert.deepStrictEqual(
    [...unfold(classNameAndSpans)],
    [],
  )
  testResolve(classNameAndSpans, ['$0', undefined])
})

test('unfold resolve plain', () => {
  const classNameAndSpans: ClassNameAndSpans = {
    type: 'plain',
    ...nameAndSpanObj('foo'),
  }

  assert.deepStrictEqual(
    [...unfoldWithPath(classNameAndSpans, [])],
    [[nameAndSpan('foo'), [0]]],
  )
  testResolve(classNameAndSpans, ['$0', 'foo'], ['$1', undefined])
})

test('unfold resolve array', () => {
  const classNameAndSpans: ClassNameAndSpans = {
    type: 'array',
    nameAndSpans: [
      {type: 'empty'},
      {type: 'plain', ...nameAndSpanObj('foo')},
      {
        type: 'array',
        nameAndSpans: [
          {type: 'plain', ...nameAndSpanObj('bar')},
          {type: 'plain', ...nameAndSpanObj('baz')},
        ]
      },
      {type: 'plain', ...nameAndSpanObj('qux')},
    ],
  }

  // TODO strictEqual everywhere
  assert.deepStrictEqual(
    [...unfoldWithPath(classNameAndSpans, [])],
    [
      [nameAndSpan('foo'), [1]],
      [nameAndSpan('bar'), [2, 0]],
      [nameAndSpan('baz'), [2, 1]],
      [nameAndSpan('qux'), [3]],
    ],
  )
  testResolve(
    classNameAndSpans,
    ['$0', undefined],
    ['$1', 'foo'],
    ['$2$0', 'bar'],
    ['$2$1', 'baz'],
    ['$2$3', undefined],
    ['$3', 'qux'],
    ['$3$0', undefined],
  )
})

test('unfold resolve object', () => {
  const classNameAndSpans = {
    type: 'object',
    nameAndSpans: {
      a: {type: 'plain', ...nameAndSpanObj('a')},
      b: {
        type: 'object',
        nameAndSpans: {
          c: {type: 'plain', ...nameAndSpanObj('c')},
          d: {type: 'empty'},
          e: {type: 'plain', ...nameAndSpanObj('e')},
        },
      },
      f: {
        type: 'array',
        nameAndSpans: [
          {type: 'plain', ...nameAndSpanObj('g')},
          {type: 'plain', ...nameAndSpanObj('h')},
          {
            type: 'object',
            nameAndSpans: {
              i: {type: 'plain', ...nameAndSpanObj('i')},
              j: {type: 'plain', ...nameAndSpanObj('j')},
            }
          }
        ],
      }
    },
  } satisfies ClassNameAndSpans
 
  assert.deepStrictEqual(
    [...unfoldWithPath(classNameAndSpans, [])],
    [
      [nameAndSpan('a'), ['a']],
      [nameAndSpan('c'), ['b', 'c']],
      [nameAndSpan('e'), ['b', 'e']],
      [nameAndSpan('g'), ['f', 0]],
      [nameAndSpan('h'), ['f', 1]],
      [nameAndSpan('i'), ['f', 2, 'i']],
      [nameAndSpan('j'), ['f', 2, 'j']],
    ],
  )

  testResolve(
    classNameAndSpans,
    ['$a', 'a'],
    ['$b$c', 'c'],
    ['$b$e', 'e'],
    ['$f$0', 'g'],
    ['$f$1', 'h'],
    ['$f$2$i', 'i'],
    ['$f$2$j', 'j'],
  )

  const unused0 = getUnusedClassNames(
    new Set(['$a', '$b$c', '$b$e', '$f$0', '$f$1', '$f$2$i', '$f$2$j']),
    classNameAndSpans,
  )
  assert.strictEqual([...unused0].length, 0)

  const unused1 = getUnusedClassNames(
    new Set(['$a', /* '$b$c',*/ '$b$e', '$f$0', '$f$1', /* '$f$2$i',*/ '$f$2$j']),
    classNameAndSpans,
  )
  assert.deepStrictEqual(
    [...unused1],
    [
      classNameAndSpans.nameAndSpans.b.nameAndSpans.c.nameAndSpan,
      classNameAndSpans.nameAndSpans.f.nameAndSpans[2].nameAndSpans!!.i.nameAndSpan,
    ])
})

function nameAndSpanObj(name: string) {
  return {
    nameAndSpan: nameAndSpan(name),
  }
}

function nameAndSpan(name: string) {
  return {
    name,
    span: {
      start: {
        line: 0,
        character: 1,
      },
      end: {
        line: 2,
        character: 3,
      },
    }
  }
}

function testResolve(classNameAndSpans: ClassNameAndSpans, ...referenceAndExpected: [string, string | undefined][]) {
  for (const [reference, expected] of referenceAndExpected) {
    assert.strictEqual(
      resolveClassNameReference(reference, classNameAndSpans),
      expected,
    )
  }
}

test('reference regex', () => {
  ['$0', '$1', '$ab$0', '$ab_01$00'].forEach(
    ref => assert(classNameReferenceRegExp().test(ref))
  );
  ['$', '$$', '$.', '$-a'].forEach(
    ref => assert(!classNameReferenceRegExp().test(ref))
  );
})

test('reference to path and back', () => {
  ([['$0', [0]], ['$1', [1]], ['$5$10', [5, 10]], ['$foo$5$bar', ['foo', 5, 'bar']]] satisfies [string, (string | number)[]][]).forEach((
    [ref, path]) => {
      assert.deepStrictEqual(referenceToPath(ref), path)
      assert.deepStrictEqual(pathToReference(path), ref)
    }
  )
})

test.run()
