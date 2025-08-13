import {css, type Css} from 'laim'

const [cn] = css(/*~~*/'a'/*~~*/) satisfies Css<{ // ~~> ../labelA.ts, ../labelA1.ts
  color: 'magenta'
}>

console.log(cn)
