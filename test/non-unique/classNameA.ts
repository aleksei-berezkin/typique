import {type Css} from 'typique'

const className = /*~~*/'a'/*~~*/ satisfies Css<{ // ~~> classNameA1.ts:4:25, n-u-subdir/classNameA.ts:3:26
  color: 'red'
}>

console.log(className)

// TODO non-unique false positive after rename