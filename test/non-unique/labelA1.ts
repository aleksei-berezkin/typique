import {css, type Css} from 'laim'


const [className] = css(/*~~*/'a'/*~~*/) satisfies Css<{ // ~~> labelA.ts:3:26, n-u-subdir/labelA.ts:3:24
  color: 'blue'
}>

console.log(className)
