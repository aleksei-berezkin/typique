import {type Css} from 'typique'

const cnClass = /*~~*/'b'/*~~ link::1 fix:b:cn */ satisfies Css<{
  color: 'red'
}>

const cn2Class = /*~~*/'b'/*~~ link::0 fix:b:cn2 */ satisfies Css<{
  color: 'blue'
}>

console.log(cnClass, cn2Class)
