import {type Css} from 'typique'

const clsAt_n_g = 'cls-at-n-g' satisfies Css<{
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

console.log(clsAt_n_g)
