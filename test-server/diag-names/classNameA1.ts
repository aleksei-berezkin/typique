import {type Css} from 'typique'

const aClassName = /*~~*/'a'/*~~ duplicate(alsoDeclared(classNameA.ts, 0) alsoDeclared(dup-subdir/classNameA.ts, 0) fix(a-0)) */ satisfies Css<{
  color: 'blue'
}>

console.log(aClassName)
