import {css, type Css} from 'laim'

const [cn] = css(/*~~*/'a'/*~~*/) satisfies Css<{ // ~~ labelA.ts, n-u-subdir/labelA.ts
  color: 'blue'
}>

console.log(cn)
