import {type Css} from 'laim'

const className = 'cls' satisfies Css<{
  color: 'red'
}>

console.log(className)
