import {css, type Css} from 'laim'

const [name] = css(/*~~*/'a'/*~~*/) satisfies Css<{ // ~~> labelA1.ts, n-u-subdir/labelA.ts
  color: 'red'
}>

console.log(name)
