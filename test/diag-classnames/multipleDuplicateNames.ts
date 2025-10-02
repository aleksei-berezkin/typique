import type {Css} from 'typique'

const [buttonClass, headerClass] = [/*~~*/''/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,button) fix(button)) duplicate(alsoDeclared(,1) fix(button)) */, /*~~*/''/*~~ doesNotSatisfy(contextNameEvaluatedTo(,1,header) fix(header)) duplicate(alsoDeclared(,0) fix(header)) unused() */] satisfies Css<{
  color: 'red'
}>

console.log(buttonClass, headerClass)
