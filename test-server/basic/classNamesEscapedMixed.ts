import { type Css } from 'typique'

const [flexClass, flexColumnClass] = ['flx', 'flx-col'] satisfies Css<{
  display: 'flex'
  '&.hidden': {
    display: 'none'
  }
  '&.$1': {
    'flex-direction': 'column'
  }
}>

console.log(flexClass, flexColumnClass)
