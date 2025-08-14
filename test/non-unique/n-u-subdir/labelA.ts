import {type Css} from 'laim'

const className1 = /*~~*/'a'/*~~*/ satisfies Css<{ // ~~> ../labelA.ts:3:25, ../labelA1.ts:4:25
  color: 'magenta'
}>

console.log(className1)
