import { type Css } from 'typique'

const [rootClass, largeClass, boldClass, smallClass] = ['root', 'large', 'bold', 'small'] satisfies Css<{
  padding: '1rem'
  '&.lg': {
    padding: '1.3rem'
    '&.b': {
      'font-weight': '700'
    }
  }
  '&.sm': {
    padding: '0.5rem'
    '&.b': {
      'font-weight': '600'
    }
  }
}>

console.log(rootClass, largeClass, boldClass, smallClass)
