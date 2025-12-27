import type { Css } from 'typique'

const aClass = 'a' satisfies Css<{
  color: 'red'
}>

console.log(aClass)
