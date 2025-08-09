import {css, type Css} from 'laim'

const [cn] = css('cls-a') satisfies Css<{
  color: 'red'
  '@media (max-width: 600px)': {
    color: 'cyan'
  }
  padding: 1
  '@media (min-width: 1600px)': {
    body: {
      color: 'cyan'
    }
  }
}>

console.log(cn)
