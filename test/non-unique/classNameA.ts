import {type Css} from 'typique'

const aClass = /*~~*/'a'/*~~*/ satisfies Css<{ // ~~> classNameA1.ts:4:25, n-u-subdir/classNameA.ts:3:26 // TODO highlighted fragments IDs or carets
  color: 'red'
}>

console.log(aClass)

// TODO non-unique false positive after rename