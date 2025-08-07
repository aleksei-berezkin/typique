import { test } from 'uvu'
import assert from 'node:assert'
import { css, cssVar, cssVars } from '../index.ts'

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

test.run()
