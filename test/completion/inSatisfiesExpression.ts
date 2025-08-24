import type {Css} from 'typique'

const myButtonClass = /*|>>*/ '' satisfies Css<{color: 'red'}>

const [cnButton, cnHeader] = [/*|>*/'', ''/*<|*/] satisfies Css<{color: 'red'}>

const buttonClass = 'button' satisfies Css<{color: 'blue'}>

console.log(myButtonClass, buttonClass)
