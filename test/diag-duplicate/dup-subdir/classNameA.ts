import {type Css} from 'typique'

const className1 = /*~~*/'a'/*~~ duplicate(link(../classNameA.ts, 0) link(../classNameA1.ts, 0)) */ satisfies Css<{
  color: 'magenta'
}>

console.log(className1)
