import assert from 'node:assert'
import { test } from '../../../testUtil/test.mjs'
import { cc, co } from './index.ts'

test('cc empty', () => {
  assert.strictEqual(cc(), '')
  assert.strictEqual(cc(''), '')
})

test('cc', () => {
  assert.strictEqual(
    cc('', 'a', 0, 1, true, false, undefined, null, 'b'),
    'a 1 true b',
  )
})

test('co empty', () => {
  assert.strictEqual(
    co(
      {},
      {}
    ),
    '',
  )
})

test('co root only', () => {
  assert.strictEqual(
    co(
      {},
      {_: 'root'}
    ),
    'root',
  )
})

test('co string val', () => {
  assert.strictEqual(
    co(
      {size: 'x-l', kind: undefined},
      {
        _: 'root',
        size: {
          lg: 'root-lg',
          'x-l': 'root-x-l',
        },
        kind: {
          primary: 'root-primary',
          secondary: 'root-secondary',
        },
      }
    ),
    'root root-x-l',
  )
})

test('co boolean', () => {
  assert.strictEqual(
    co({
      large: false,
      secondary: true,
    }, {
      large: 'large',
      secondary: 'secondary',
    }),
    'secondary',
  )
})

test('co boolean true / false', () => {
  assert.strictEqual(
    co({
      large: true,
      secondary: false,
    }, {
      large: {
        true: 'large-true',
        false: 'large-false',
      },
      secondary: {
        true: 'secondary-true',
        false: 'secondary-false',
      },
    }),
    'large-true secondary-false',
  )
})
