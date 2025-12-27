import { s } from './_suffix.js'
import type { Css } from 'typique'

const myClass = `my_${s}` satisfies Css<{
  color: 'turquoise'
}>

const my_Class = /* "`my-0_${s}` satisfies Css<{}>" |>0,1,2*/``

console.log(myClass, my_Class)
