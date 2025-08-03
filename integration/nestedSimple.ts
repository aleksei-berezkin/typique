import { type Css, css } from 'laim'

const [cn] = css('cls-n') satisfies Css<{
  color: 'red'
  '&:active': {
    color: 'magenta'
    '& > span': {
      color: 'cyan'
    }
  }
}>

console.log(cn)
