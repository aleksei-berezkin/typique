import {type Css} from 'typique'

function FunctionNonstandard1() {
  // No error
  return `<div> class=${ /* (includes-not) function |>1*/'cName' }</div>`
}

function FunctionNonstandard2() {
  return `<div> class=${ /* (includes-not) function |>8*/ /*~~*/'ff2'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,FunctionNonstandard2) skipFixes()) */ satisfies Css<{ color: 'red' }> }</div>`
}


const functionClassName = () => /* (includes) function |>8*/ /*~~*/'std_fn'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,function) skipFixes()) */ satisfies Css<{ color: 'red' }>

const functionNonstandard3 = () => /* (includes-not) function |>8*/ /*~~*/'ff3'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,functionNonstandard3) skipFixes()) */ satisfies Css<{ color: 'red' }>

console.log(FunctionNonstandard1, FunctionNonstandard2, functionClassName, functionNonstandard3)
