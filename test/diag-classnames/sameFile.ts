import {type Css} from 'typique'

const cnAClass = /*~~*/'b'/*~~ doesNotSatisfy(msg(,'${contextName}') contextNameEvaluatedTo(,,cnA) fix(cn-a) fix(a-0)) duplicate(alsoDeclared(,2) fix(cn-a) fix(a-0)) */ satisfies Css<{
  color: 'red'
}>

const cnB2Class = /*~~*/'b'/*~~ duplicate(alsoDeclared(,1) fix(cn-b2) fix(b2)) */ satisfies Css<{
  color: 'blue'
}>

console.log(cnAClass, cnB2Class)
