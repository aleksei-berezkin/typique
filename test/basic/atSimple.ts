import type { Css } from 'typique';

const cn = 'cls-at' satisfies Css<{
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

const abcClass = 

console.log(cn)
