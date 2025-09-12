import {type Css} from 'typique'

const name1 = /*~~*/'a'/*~~ duplicate(link(../classNameA.ts, 0) link(../classNameA1.ts, 0) fix(name1)) */ satisfies Css<{
  color: 'magenta'
}>

console.log(name1)
