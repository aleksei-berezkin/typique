import { type Css } from 'typique'

const [largeClass, boldClass, smallClass] = ['large-1', 'bold-1', 'small-1'] satisfies Css<{
  '.$0': {
    padding: '1.3rem'
    '&.$1': {
      'font-weight': '700'
    }
  }
  '.$2': {
    padding: '0.5rem'
    '&.$1': {
      'font-weight': '600'
    }
  }
}>

console.log(largeClass, boldClass, smallClass)
