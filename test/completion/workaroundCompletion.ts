import type {Css} from 'typique'

const buttonClass = 'button-10' satisfies Css<{
  color: 'red'
  /* margin ... | >1*/m
}>

console.log(buttonClass)
