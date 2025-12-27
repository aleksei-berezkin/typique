import type {Css, Var} from 'typique'

const my__Var = '--my' satisfies Var

const myVar = /*~~*/'--my-0'/*~~ duplicate(alsoDeclared(,1) fix(--my-1)) */ satisfies Var

const my_Var = /*~~*/'--my-0'/*~~ duplicate(alsoDeclared(,0) fix(--my-1)) */ satisfies Var

const myClass = '--my-1' satisfies Css<{
  color: 'red'
}>

console.log(my__Var, myVar, my_Var, myClass)
