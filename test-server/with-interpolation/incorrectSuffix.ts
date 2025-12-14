import type { Css } from 'typique'
import { s as _s } from './_suffix.js'

const suf = _s

const incorrectClass = /*~~*/`incorrect_${suf}`/*~~ doesNotSatisfy(msg(,${contextName}_${s}) contextNameEvaluatedTo(,,incorrect) skipFixes()) */ satisfies Css<{
  color: 'blue'
}>

console.log(incorrectClass)
