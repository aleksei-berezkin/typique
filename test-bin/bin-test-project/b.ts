import type { Css } from 'typique'

const bClass = 'b' satisfies Css<{
  color: 'blue'
}>

console.log(bClass)
