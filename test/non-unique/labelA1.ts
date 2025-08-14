import {type Css} from 'laim'


const className = /*~~*/'a'/*~~*/ satisfies Css<{ // ~~> labelA.ts:3:25, n-u-subdir/labelA.ts:3:26
  color: 'blue'
}>

console.log(className)
