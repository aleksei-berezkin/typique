import {type Css} from 'laim'

const className1 = /*~~*/'a'/*~~*/ satisfies Css<{ // ~~> ../classNameA.ts:3:25, ../classNameA1.ts:4:25
  color: 'magenta'
}>

console.log(className1)
