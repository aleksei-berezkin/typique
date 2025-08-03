import {css, type Css} from 'laim'

const [cn] = css('cls-g') satisfies Css<{
  margin: 1
  '@font-face': {
    // TODO wrongly interpreted as scoped and put under `&`
    'font-family': 'Arial'
  }
  // '@import url(other.css)': {}, // TODO: support `null`
  '@media (max-width: 600px)': {
    body: {
      color: 'cyan'
    }
  }
}>

console.log(cn)
