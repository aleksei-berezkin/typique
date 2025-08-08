import {css, type Css} from 'laim'

const [name] = css('cls') satisfies Css<{
  color: 'red'
}>

console.log(name)
