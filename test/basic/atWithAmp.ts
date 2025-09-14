import type { Css } from 'typique';

const clsW = 'cls-w' satisfies Css<{
  color: 'red'
  '@media (max-width: 600px)': {
    margin: 1
    // Should produce the same as without &
    '&': {
      color: 'cyan'
      '&:active': {
        color: 'magenta'
      }
    }
    padding: 2
  }
  padding: 1
}>

console.log(clsW)
