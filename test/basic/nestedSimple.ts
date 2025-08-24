import { type Css } from 'typique'

const cn = 'cls-n' satisfies Css<{
  color: 'red'
  '&:active': {
    color: 'magenta'
    '& > span': {
      color: 'cyan'
    }
  }
}>

console.log(cn)
