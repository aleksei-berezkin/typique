import type {Css} from 'typique'

const myButtonClass = /*|>1*/'' satisfies Css<{color: 'red'}>

const [cnButton, cnHeader] = [/*|>1*/'', /*|>1*/''] satisfies Css<{color: 'red'}>

const buttonClass = 'button' satisfies Css<{color: 'blue'}>

console.log(myButtonClass, buttonClass, cnButton, cnHeader)
