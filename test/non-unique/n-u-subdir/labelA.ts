import {css, type Css} from 'laim'

const [cn] = css(/*~~*/'a'/*~~*/) satisfies Css<{ // ~~> ../labelA.ts:3:26, ../labelA1.ts:4:31
  color: 'magenta'
}>

console.log(cn)
