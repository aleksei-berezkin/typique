import {css, type Css} from 'laim'

const [className] = css(/*~~*/'a'/*~~*/) satisfies Css<{ // ~~> labelA.ts, n-u-subdir/labelA.ts
  color: 'blue'
}>

console.log(className)
