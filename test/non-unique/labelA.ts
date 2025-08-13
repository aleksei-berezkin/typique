import {css, type Css} from 'laim'

const [cn] = css(/*~~*/'a'/*~~*/) satisfies Css<{ // ~~ labelA1.ts, n-u-subdir/labelA.ts
  color: 'red'
}>

console.log(cn)
