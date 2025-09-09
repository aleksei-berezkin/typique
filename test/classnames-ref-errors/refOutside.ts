import type {Css} from 'typique'

const [aClass, bClass] = 'a' satisfies Css<{
  color: 'red'
  /*~~*/'&.$1'/*~~ tupleHasNoElement{["a"]; 1; 1}*/: {
    color: 'orange'
  }
}>

console.log(aClass, bClass)
