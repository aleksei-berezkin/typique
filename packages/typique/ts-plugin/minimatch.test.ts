import { Minimatch } from 'minimatch'
import { test } from '../../../testUtil/test.mjs'
import assert from 'node:assert'

test('simple', () => {
  const m = new Minimatch('*.ts')
  assert(m.match('foo.ts'))
  assert(!m.match('foo.js'))
})

test('all', () => {
  const m = new Minimatch('**/*')
  assert(m.match('foo'))
  assert(m.match('foo.js'))
  assert(m.match('foo.mts'))
  assert(m.match('bar/foo.ts'))
  assert(m.match('/bar/foo.tsx'))
  assert(m.match('baz/bar/foo.vue'))
  assert(m.match('/baz/bar/foo.mjs'))
})

test('rel', () => {
  const m = new Minimatch('**/*.ts')
  assert(m.match('foo.ts'))
  assert(m.match('a/foo.ts'))
  assert(m.match('/a/b/foo.ts'))
  assert(!m.match('a/b/foo.ts/c'))
})

test('*/node_modules/*', () => {
  const m = new Minimatch('*/node_modules/*')
  assert(!m.match('a/node_modules'))
  assert(m.match('a/node_modules/b.ts'))
  assert(!m.match('/a/node_modules/b.ts'))
  assert(!m.match('a/node_modules/b.ts/c'))
})

test('**/node_modules/*', () => {
  const m = new Minimatch('**/node_modules/*')
  assert(m.match('node_modules/b'))
  assert(m.match('a/node_modules/b.ts'))
  assert(m.match('/a/node_modules/b.ts'))
  assert(m.match('/a/b/node_modules/b.ts'))
  assert(!m.match('/a/b/node_modules/b/c'))
})

test('**/node_modules/**', () => {
  const m = new Minimatch('**/node_modules/**')
  assert(!m.match('node_modules'))  // Uncertain case
  assert(m.match('node_modules/'))
  assert(m.match('a/node_modules/b.ts'))
  assert(m.match('/a/node_modules/b.ts'))
  assert(m.match('/a/b/node_modules/b.ts'))
  assert(m.match('/a/b/node_modules/b/c/d/e'))
})

test('*/**/node_modules/**/*', () => {
  // Unlike **/node_modules/**, only `node_modules/` do not match
  const m = new Minimatch('*/**/node_modules/**/*')
  assert(!m.match('node_modules/'))
  assert(m.match('a/node_modules/b.ts'))
  assert(!m.match('/a/node_modules/b.ts')) // no leading /
  assert(m.match('a/b/node_modules/b.ts'))
  assert(m.match('a/b/node_modules/b/c/d/e'))
})
