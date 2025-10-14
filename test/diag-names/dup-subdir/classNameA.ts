import {type Css} from 'typique'

const cnA = /*~~*/'a'/*~~ duplicate(alsoDeclared(../classNameA.ts, 0) alsoDeclared(../classNameA1.ts, 0) fix(cn-a) fix(a-0)) */ satisfies Css<{
  color: 'magenta'
}>

console.log(cnA)
