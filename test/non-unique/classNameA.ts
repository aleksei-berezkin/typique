import {type Css} from 'typique'

const aClass = /*~~*/'a'/*~~ link:classNameA1.ts:0 link:n-u-subdir/classNameA.ts:0 fix:a->a0*/ satisfies Css<{
  color: 'red'
}>

console.log(aClass)
