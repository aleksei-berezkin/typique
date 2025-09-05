import {type Css} from 'typique'

const aClassName = /*~~*/'a'/*~~ link:classNameA.ts:0 link:n-u-subdir/classNameA.ts:0 fix:a->a-0 */ satisfies Css<{
  color: 'blue'
}>

console.log(aClassName)
