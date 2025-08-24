import { type Css } from 'typique'

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
