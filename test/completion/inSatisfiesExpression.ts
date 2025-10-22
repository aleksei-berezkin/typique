import type {Css} from 'typique'

const myButtonClass = /* my-button button-0 my |>1*/'' satisfies Css<{color: 'red'}>

const [cnButton, cnHeader] = [/* button-0 |>1*/'', /* header |>1*/''] satisfies Css<{color: 'red'}>

const buttonClass = 'button' satisfies Css<{color: 'blue'}>

console.log(myButtonClass, buttonClass, cnButton, cnHeader)
