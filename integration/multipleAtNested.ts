import {css, type Css} from 'laim'

const [cn] = css('cls-a') satisfies Css<{
  color: 'red'
  '@media (max-width: 600px)': {
    color: 'cyan'
  }
  '@media (min-width: 1600px)': {
    color: 'magenta'
  }
}>

console.log(cn)
