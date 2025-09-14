import { type Css } from 'typique'

const titleEsc = 'title-esc' satisfies Css<{
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

console.log(titleEsc)
