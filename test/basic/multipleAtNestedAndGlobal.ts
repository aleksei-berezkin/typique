import {type Css} from 'typique'

const cn1 = 'cls-at-n-g' satisfies Css<{
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

console.log(cn1)
