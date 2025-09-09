import type {Css} from 'typique'

const [aClass, bClass] = [/*~~*/'a-1'/*~~ unused{} */, /*~~*/'b-1'/*~~ unused{} */] satisfies Css<{
  body: {
    color: '#333'
  }
}>

console.log(aClass, bClass)
