import {type Css} from 'typique'

const cnA = /*~~*/'a'/*~~ duplicate(link(../classNameA.ts, 0) link(../classNameA1.ts, 0) fix(cn-a) fix(a-0)) */ satisfies Css<{
  color: 'magenta'
}>

console.log(cnA)
