import { type Css, css } from 'laim';

const [cn] = css('cls-a') satisfies Css<{
  color: 'red'
  '@media (max-width: 600px)': {
    color: 'cyan'
    '&:active': {
      color: 'magenta'
    }
    padding: 2
  }
  padding: 1
}>

console.log(cn)
