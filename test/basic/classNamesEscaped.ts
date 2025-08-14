import { type Css } from 'laim'

const bold = 'title-esc' satisfies Css<{
  '.$$large': {
    padding: '1.3rem'
    '&.bold': {
      'font-weight': '700'
    }
  }
  '.$$small': {
    padding: '0.5rem'
    '&.bold': {
      'font-weight': '600'
    }
  }
}>

console.log(bold)
