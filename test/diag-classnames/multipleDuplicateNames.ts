import type {Css} from 'typique'

const [buttonClass, headerClass] = [/*~~*/''/*~~ doesNotSatisfy(msg(,${varName}) fix(button)) duplicate(link(,2) fix(button)) */, /*~~*/''/*~~ doesNotSatisfy(msg(,${varName}) fix(header)) duplicate(link(,0) fix(header)) unused() */] satisfies Css<{
  color: 'red'
}>

console.log(buttonClass, headerClass)
