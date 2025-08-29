import type {Css} from 'typique'

// TODO highlighting on the same line not working
const [aClass, bClass] = [/*~~*/'a-1'/*~~*/,
  /*~~*/'b-1'/*~~*/] satisfies Css<{
  body: {
    color: '#333'
  }
}>

console.log(aClass, bClass)
