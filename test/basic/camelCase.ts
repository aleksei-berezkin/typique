import type { Css } from 'typique'

const cn = 'camel' satisfies Css<{
  fontFamily: '"Open Sans"'
  'background-color': ['red', 'oklch(100% 0 0)']
  '--col': 'blue'
  '&:active': {
    'font-family': 'Arial'
    backgroundColor: ['pink', 'oklch(10% 0 0)']
    '--col': 'magenta'
  }
}>

console.log(cn)
