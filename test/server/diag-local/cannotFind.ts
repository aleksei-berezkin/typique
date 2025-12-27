import type {Css} from 'typique'

const [aClass, bClass] = 'a' satisfies Css<{
  color: 'red'
  /*~~*/'&.$1'/*~~ cannotFind(msg('$1'))*/: {
    color: 'orange'
  }
}>

console.log(aClass, bClass)
