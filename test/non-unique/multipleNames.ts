import {type Css} from 'typique'

// TODO multiple on the same line
const [mClass, nClass] = [/*~~*/'m'/*~~*/, 'n'] satisfies Css<{ // ~~> multipleNames.ts:11:34
  color: 'red'
  '&.$1': {
    color: 'orange'
  }
}>

const [mClass1, oClass] = [/*~~*/'m'/*~~*/, 'o'] satisfies Css<{ // ~~> multipleNames.ts:4:33
  color: 'magenta'
}>

console.log(mClass, nClass, mClass1, oClass)
