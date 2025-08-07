import { type Css, css } from 'laim'

const [root, large, bold, small] = css('title') satisfies Css<{
  padding: '1rem'
  '&.large': {
    padding: '1.3rem'
    '&.bold': {
      'font-weight': '700'
    }
  }
  '&.small': {
    padding: '0.5rem'
    '&.bold': {
      'font-weight': '600'
    }
  }
}>

console.log(root, large, bold, small)
