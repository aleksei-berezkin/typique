import {type Css} from 'typique'

const aClass = /*~~*/'a'/*~~ link:classNameA1.ts:0 link:dup-subdir/classNameA.ts:0 fix:a-0 */ satisfies Css<{
  color: 'red'
}>

console.log(aClass)
