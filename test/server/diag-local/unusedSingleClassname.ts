import type { Css } from 'typique'

// No error, empty
const unusedClass = 'unused' satisfies Css<{}>
const unused1Class = 'unused1' satisfies Css<{
}>

const unused2Class = /*~~*/'unused2'/*~~ unused() */ satisfies Css<{
  body: {}
}>

console.log(unusedClass, unused1Class, unused2Class)
