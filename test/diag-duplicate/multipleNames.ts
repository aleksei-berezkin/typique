import {type Css} from 'typique'

const [mClass, nClass] = [/*~~*/'m'/*~~ duplicate(link(,2) fix(m-0)) */, /*~~*/'n'/*~~ duplicate(link(,3) fix(n-0)) */] satisfies Css<{
  color: 'red'
  '&.$1': {
    color: 'orange'
  }
}>

const [m1Class, n2Class] = [/*~~*/'m'/*~~ duplicate(link(,0) fix(m1)) */, /*~~*/'n'/*~~ duplicate(link(,1) fix(n2)) */] satisfies Css<{
  color: 'magenta'
  $1: {
    color: 'cyan'
  }
}>

console.log(mClass, nClass, m1Class, n2Class)
