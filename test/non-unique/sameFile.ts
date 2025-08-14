import {css, type Css} from 'laim'

const [cn] = css(/*~~*/'b'/*~~*/) satisfies Css<{ // ~~> sameFile.ts:7:25
  color: 'red'
}>

const [cn2] = css(/*~~*/'b'/*~~*/) satisfies Css<{ // ~~> sameFile.ts:3:24
  color: 'blue'
}>

console.log(cn, cn2)
