import {type Css} from 'typique'

const cnAClass = /*~~*/'b'/*~~ doesNotSatisfy(msg(,'${varName}') fix(cn-a) fix(a-0)) duplicate(link(,2) fix(cn-a) fix(a-0)) */ satisfies Css<{
  color: 'red'
}>

const cnB2Class = /*~~*/'b'/*~~ duplicate(link(,1) fix(cn-b2) fix(b2)) */ satisfies Css<{
  color: 'blue'
}>

console.log(cnAClass, cnB2Class)
