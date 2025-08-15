import {type Css} from 'laim'

// TODO multiple on the same line
const [mClass, nClass] = [/*~~*/'m'/*~~*/, 'n'] satisfies Css<{ // ~~> multipleNames.ts:11:34
  color: 'red'
  '&.x': {
    color: 'orange'
  }
}>

const [mClass1, oClass] = [/*~~*/'m'/*~~*/, 'o'] satisfies Css<{ // ~~> multipleNames.ts:4:33
  color: 'magenta'
}>

console.log(mClass, nClass, mClass1, oClass)
