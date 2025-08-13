import {css, type Css} from 'laim'

const [cn] = css('a') satisfies Css<{
  color: 'magenta'
}>

console.log(cn)
