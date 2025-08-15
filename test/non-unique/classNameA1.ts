import {type Css} from 'laim'


const className = /*~~*/'a'/*~~*/ satisfies Css<{ // ~~> classNameA.ts:3:25, n-u-subdir/classNameA.ts:3:26
  color: 'blue'
}>

console.log(className)
