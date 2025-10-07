import {type Css} from 'typique'

const abcClass = 'abc' satisfies string satisfies Css<{
  color: 'red'
}>

const defClass = 'def' as const satisfies Css<{
  color: 'blue'
}>

const objClasses = {
  sz: {
    lg: 'obj-sz-lg',
    sm: 'obj-sz-sm',
  }
} as const satisfies Css<{
  color: 'turquoise'
  '.$sz$sm': {
    fontSize: 11
  }
  '.$sz$lg': {
    fontSize: 15
  }
}>

console.log(abcClass, defClass, objClasses)
