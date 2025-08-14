import {type Css} from 'laim'

const className = /*~~*/'a'/*~~*/ satisfies Css<{ // ~~> labelA1.ts:4:25, n-u-subdir/labelA.ts:3:26
  color: 'red'
}>

console.log(className)
