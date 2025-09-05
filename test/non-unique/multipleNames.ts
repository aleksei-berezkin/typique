import {type Css} from 'typique'

// TODO multiple on the same line
const [mClass, nClass] = [/*~~*/'m'/*~~ link::1 fix:m->m-0 */, 'n'] satisfies Css<{
  color: 'red'
  '&.$1': {
    color: 'orange'
  }
}>

const [m1Class, oClass] = [/*~~*/'m'/*~~ link::0 fix:m->m1 */, 'o'] satisfies Css<{
  color: 'magenta'
  $1: {
    color: 'cyan'
  }
}>

console.log(mClass, nClass, m1Class, oClass)
