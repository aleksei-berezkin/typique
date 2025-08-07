import {css, type Css} from 'laim'

const prefix = 'pref'

const [cn] = css(`${prefix}-a`) satisfies Css<{
  color: 'red'
}>

const [cn2] = css((() => { return `${prefix}-b` as const })()) satisfies Css<{
  color: 'blue'
}>

console.log(cn, cn2)
