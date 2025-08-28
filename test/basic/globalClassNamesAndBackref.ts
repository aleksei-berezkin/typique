import { type Css } from 'typique'

const bold = 'title-esc' satisfies Css<{
  '.large': {
    padding: '1.3rem'
    '&.$0': {
      'font-weight': '700'
    }
  }
  '.small': {
    padding: '0.5rem'
    '&.$0': {
      'font-weight': '600'
    }
  }
}>

console.log(bold)
