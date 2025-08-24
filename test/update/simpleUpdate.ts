import {type Css} from 'typique'

const className = 'cls' satisfies Css<{
  color: 'red'
}>

console.log(className)
