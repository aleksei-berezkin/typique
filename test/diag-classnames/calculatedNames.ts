import type { Css } from 'typique'

const suffix = '-s'
// TODO no fix
const cName = /*~~*/`c${suffix}`/*~~ duplicate(msg(c-s) link(,1)) */ satisfies Css<{ color: 'red' }>

// TODO should also suggest c-s
const c_sName = /*~~*/'c-s'/*~~ duplicate(link(,0) fix(c-s-name) fix(s-name) fix(name)) */ satisfies Css<{ color: 'blue' }>

console.log(cName, c_sName)
