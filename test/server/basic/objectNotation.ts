import type {Css} from 'typique'

const objClasses = {
  root: 'obj',
  sz: {
    sm: 'obj-1',
    lg: 'obj-2',
    'x-l': 'obj-3'
  },
} satisfies Css<{
  color: 'cobalt'
  '.$sz$sm': {
    fontSize: '0.75em'
  }
  '.$sz$lg': {
    fontSize: '2em'
  }
  '.$sz$x-l': {
    fontSize: '3em'
  }
}>

console.log(objClasses)
