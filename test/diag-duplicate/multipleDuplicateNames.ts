import type {Css} from 'typique'

const [buttonClass, headerClass] = [/*~~*/''/*~~ duplicate(link(,1) fix(button)) */, /*~~*/''/*~~ duplicate(link(,0) fix(header)) unused() */] satisfies Css<{
  color: 'red'
}>

console.log(buttonClass, headerClass)
