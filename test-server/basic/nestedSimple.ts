import { type Css } from 'typique'

const clsN = 'cls-n' satisfies Css<{
  color: 'red'
  '&:active': {
    color: 'magenta'
    '& > span': {
      color: 'cyan'
    }
  }
}>

console.log(clsN)
