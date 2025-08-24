import {type Css} from 'typique'

const cn = /*~~*/'b'/*~~*/ satisfies Css<{ // ~~> sameFile.ts:7:19
  color: 'red'
}>

const cn2 = /*~~*/'b'/*~~*/ satisfies Css<{ // ~~> sameFile.ts:3:18
  color: 'blue'
}>

console.log(cn, cn2)
