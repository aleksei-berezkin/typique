import {css, type Css} from 'laim'

const [cn] = css('cls-o') satisfies Css<{
  '@font-face': {
    'font-family': 'Arial'
    src: 'localhost'
  }
  '@property --my': {
    syntax: '"number"'
    inherits: 'false' // TODO boolean
  }
  '@scope (.$$card)': {
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
