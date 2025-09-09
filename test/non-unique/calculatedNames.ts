import type { Css } from 'typique'

const suffix = '-s'
const cName = /*~~*/`c${suffix}`/*~~ className:c-s link::1 */ satisfies Css<{ color: 'red' }>

const cName1 = /*~~*/'c-s'/*~~ link::0 */ satisfies Css<{ color: 'blue' }>

console.log(cName, cName1)
