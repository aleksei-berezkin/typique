import type { Css } from 'typique'

const suffix = '-s'
// TODO no fix
const cName = /*~~*/`c${suffix}`/*~~ duplicate(msg(c-s) link(,1)) */ satisfies Css<{ color: 'red' }>

const cName1 = /*~~*/'c-s'/*~~ duplicate(link(,0) fix(c-name1) fix(name1)) */ satisfies Css<{ color: 'blue' }>

console.log(cName, cName1)
