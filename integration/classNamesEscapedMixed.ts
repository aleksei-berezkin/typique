import { type Css, css } from 'laim'

const [flexClass] = css('flx') satisfies Css<{
  display: 'flex'
  '&.$$hidden': {
    display: 'none'
  }
  '&.column': {
    'flex-direction': 'column'
  }
}>

console.log(flexClass)
