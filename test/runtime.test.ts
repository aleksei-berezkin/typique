import { test } from 'uvu'
import assert from 'node:assert'
import { css, cssVar, cssVars } from '../index.ts'
import { css as prefixedCss, cssVar as prefixedCssVar, cssVars as prefixedCssVars } from './prefix/my-laim.ts'

// We are testing runtime here, not near ../index.ts,
// because latter requires compiling to JS

test('css', () => {
  const [l0, l1, l2] = css('label')
  assert.equal(l0, 'label-0')
  assert.equal(l1, 'label-1')
  assert.equal(l2, 'label-2')
})

test('css overflow', () => {
  const labels: string[] = []
  try {
    for (const l of css('over')) {
      labels.push(l)
    }
  } catch (_) {
  }
  assert.equal(labels.length, 99)
  assert.deepEqual(
    labels,
    Array.from({length: 99}, (_, i) => `over-${i}`)
  )
})

test('cssVar', () => {  
  const v1 = cssVar('var')
  assert.equal(v1, '--var')
})

test('cssVars', () => {
  const theme = cssVars('theme', ['t1', 't2'])
  assert.deepEqual(theme, {t1: '--theme-t1', t2: '--theme-t2'})
})

test('prefixed css', () => {
  const [l0, l1] = prefixedCss('label')
  assert.equal(l0, 'my-label-0')
  assert.equal(l1, 'my-label-1')
})

test('prefixed cssVar', () => {
  const v1 = prefixedCssVar('var')
  assert.equal(v1, '--my-var')
})

test('prefixed cssVars', () => {
  const theme = prefixedCssVars('theme', ['t1', 't2'])
  assert.deepEqual(theme, {t1: '--my-theme-t1', t2: '--my-theme-t2'})
})

test.run()
