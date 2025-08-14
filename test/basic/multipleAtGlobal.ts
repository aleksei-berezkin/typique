import {type Css} from 'laim'

const cn = 'cls-g' satisfies Css<{
  margin: 1
  '@font-face': {
    'font-family': 'Arial'
    src: 'localhost'
  }
  '@media (max-width: 600px)': {
    body: {
      color: 'cyan'
    }
  }
}>

console.log(cn)
