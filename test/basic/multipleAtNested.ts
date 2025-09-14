import {type Css} from 'typique'

const clsA_N = 'cls-a-n' satisfies Css<{
  color: 'red'
  '@media (max-width: 600px)': {
    color: 'cyan'
  }
  '@media (min-width: 1600px)': {
    color: 'magenta'
  }
}>

console.log(clsA_N)
