import { type Css } from 'laim'

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
