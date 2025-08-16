import type {Css} from 'laim'

const myButtonClass = '' satisfies Css<{color: 'red'}>

const buttonClass = 'button' satisfies Css<{color: 'blue'}>

// TODO in satisfies in array literal

console.log(myButtonClass, buttonClass)
