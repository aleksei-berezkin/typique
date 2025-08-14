import { type Css } from 'laim'

const [flexClass, flexColumnClass] = ['flx', 'flx-col'] satisfies Css<{
  display: 'flex'
  '&.$$hidden': {
    display: 'none'
  }
  '&.column': {
    'flex-direction': 'column'
  }
}>

console.log(flexClass)
