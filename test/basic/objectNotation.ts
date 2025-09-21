import type {Css} from 'typique'

const objNames = {
  root: 'obj', // TODO context, completion ,fixes
  sz: {
    sm: 'obj-1',
    lg: 'obj-2'
  },
} satisfies Css<{
  color: 'cobalt'
  '.$sz$sm': {
    fontSize: '0.75em'
  }
  '.$sz$lg': {
    fontSize: '2em'
  }
}>


console.log(objNames)
