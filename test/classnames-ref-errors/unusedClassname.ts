import type { Css } from 'typique';

const [aClass, bClass] = ['a-0', /*~~*/'b-0'/*~~*/, 'c-0'] satisfies Css<{
  color: 'red'
  '&.$2': {
    color: 'orange'
  }
}>

console.log(aClass, bClass)
