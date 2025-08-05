import { type Css, css } from 'laim'

const [large, bold, small] = css('title-a') satisfies Css<{
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

console.log(large, bold, small)
