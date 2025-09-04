import { test } from 'uvu'
import assert from 'node:assert'
import { areSpansIntersecting } from './span'

test('equal', () => {
  assert(areSpansIntersecting({"start":{"line":2,"character":24},"end":{"line":2,"character":27}}, {"start":{"line":2,"character":24},"end":{"line":2,"character":27}}))
})

test.run()
