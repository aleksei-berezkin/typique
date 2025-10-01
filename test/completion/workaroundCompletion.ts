import type {Css} from 'typique'

const buttonClass = 'button-10' satisfies Css<{
  color: 'red'
  /* (includes) marginBottom marginLeft marginRight |>1*/m
}>

const button1Class = 'button-11' satisfies Css<{
  color: 'blue'
  /* (includes) accentColor alignItems |>1*/a
}>

console.log(buttonClass, button1Class)
