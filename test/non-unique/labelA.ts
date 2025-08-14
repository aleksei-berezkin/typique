import {css, type Css} from 'laim'

const [name] = css(/*~~*/'a'/*~~*/) satisfies Css<{ // ~~> labelA1.ts:4:31, n-u-subdir/labelA.ts:3:24
  color: 'red'
}>

console.log(name)
