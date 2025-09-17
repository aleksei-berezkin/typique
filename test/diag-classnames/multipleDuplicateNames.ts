import type {Css} from 'typique'

const [buttonClass, headerClass] = [/*~~*/''/*~~ doesNotSatisfy(msg(,${contextName}) fix(button)) duplicate(link(,2) fix(button)) */, /*~~*/''/*~~ doesNotSatisfy(msg(,${contextName}) fix(header)) duplicate(link(,0) fix(header)) unused() */] satisfies Css<{
  color: 'red'
}>

console.log(buttonClass, headerClass)
