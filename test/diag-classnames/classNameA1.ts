import {type Css} from 'typique'

const aClassName = /*~~*/'a'/*~~ duplicate(link(classNameA.ts, 0) link(dup-subdir/classNameA.ts, 0) fix(a-0)) */ satisfies Css<{
  color: 'blue'
}>

console.log(aClassName)
