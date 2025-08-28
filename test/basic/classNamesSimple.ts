import { type Css } from 'typique'

const [rootClass, largeClass, boldClass, smallClass] = ['root', 'large', 'bold', 'small'] satisfies Css<{
  padding: '1rem'
  '&.$1': {
    padding: '1.3rem'
    '&.$2': {
      'font-weight': '700'
    }
  }
  '&.$3': {
    padding: '0.5rem'
    '&.$2': {
      'font-weight': '600'
    }
  }
}>

console.log(rootClass, largeClass, boldClass, smallClass)
