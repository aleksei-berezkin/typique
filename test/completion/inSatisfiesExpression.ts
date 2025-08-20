import type {Css} from 'laim'

const myButtonClass = '' satisfies Css<{color: 'red'}>

const [cnButton, cnHeader] = ['', ''] satisfies Css<{color: 'red'}>

const buttonClass = 'button' satisfies Css<{color: 'blue'}>

console.log(myButtonClass, buttonClass)
