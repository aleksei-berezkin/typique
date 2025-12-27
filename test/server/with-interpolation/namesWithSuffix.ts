import { s } from './_suffix.js'
import type { Css } from 'typique'

const simpleClass = `simple_${s}` satisfies Css<{
  color: 'red'
}>

console.log(simpleClass)
