import {type Css} from 'typique'

const cnAClass = /*~~*/'b'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cnA) fix(cn-a) fix(cn) fix(a-0)) duplicate(alsoDeclared(,1) fix(cn-a) fix(cn) fix(a-0)) */ satisfies Css<{
  color: 'red'
}>

const cnB2Class = /*~~*/'b'/*~~ duplicate(alsoDeclared(,0) fix(cn-b2) fix(b2) fix(cn)) */ satisfies Css<{
  color: 'blue'
}>

console.log(cnAClass, cnB2Class)
