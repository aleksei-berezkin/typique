import {css, type Css} from 'laim'

const [cn] = css('cls-a') satisfies Css<{
  color: 'red'
  '@media (max-width: 600px)': {
    color: 'cyan'
    '&:active, &:hover': {
      color: 'magenta'
    }
  }
  animation: 'spin-1 1s linear infinite'
  '@keyframes spin-1': {
    '0%': {
      transform: 'rotate(0deg)'
    }
    '100%': {
      transform: 'rotate(360deg)'
    }
  }
}>

console.log(cn)
