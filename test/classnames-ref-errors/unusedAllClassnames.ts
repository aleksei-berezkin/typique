import type {Css} from 'typique'

const [aClass, bClass] = [/*~~*/'a-1'/*~~*/, /*~~*/'b-1'/*~~*/] satisfies Css<{
  body: {
    color: '#333'
  }
}>

console.log(aClass, bClass)
