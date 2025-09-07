import {type Css} from 'typique'

const cnAClass = /*~~*/'b'/*~~ link::1 fix:b:cn-a fix:b:a-0 */ satisfies Css<{
  color: 'red'
}>

const cnB2Class = /*~~*/'b'/*~~ link::0 fix:b:cn-b2 fix:b:b2 */ satisfies Css<{
  color: 'blue'
}>

console.log(cnAClass, cnB2Class)
