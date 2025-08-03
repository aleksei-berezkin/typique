import {css, type Css} from 'laim'

const [cn] = css('cls-o') satisfies Css<{
  // TODO both misinterpreted as local
  // '@font-face': {
  //   'font-family': 'Arial'
  // }
  // '@property --my': {
  //   syntax: '<number>'
  //   inherits: 'false'
  // }
  '@scope (.card)': {
    h2: {
      color: 'blue'
    }
  }
  '@media (max-width: 600px)': {
    body: {
      color: 'cyan'
    }
  }
}>

console.log(cn)
