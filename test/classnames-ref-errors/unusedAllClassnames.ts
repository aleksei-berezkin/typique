import type {Css} from 'typique'

const [aClass, bClass] = [/*~~*/'a-1'/*~~ type:unused */, /*~~*/'b-1'/*~~ type:unused */] satisfies Css<{
  body: {
    color: '#333'
  }
}>

console.log(aClass, bClass)
