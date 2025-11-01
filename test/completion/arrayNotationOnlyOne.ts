import { Css } from 'typique'

const [onlyOneClass] = [/* only-one only one |>1*/''] satisfies Css<{ color: 'red' }>

console.log(onlyOneClass)
