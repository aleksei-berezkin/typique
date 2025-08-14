import { type Css } from 'laim'

const [largeClass, boldClass, smallClass] = ['large-1', 'bold-1', 'small-1'] satisfies Css<{
  '.large': {
    padding: '1.3rem'
    '&.bold': {
      'font-weight': '700'
    }
  }
  '.small': {
    padding: '0.5rem'
    '&.bold': {
      'font-weight': '600'
    }
  }
}>

console.log(largeClass, boldClass, smallClass)
