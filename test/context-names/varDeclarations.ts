import {type Css} from 'typique'

const constNonstandard1 = `<div> class=${ /* (includes-not) const |>8*/ /*~~*/'cc1'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,constNonstandard1) skipFixes()) */ satisfies Css<{ color: 'red' }> }</div>`

const constNonstandard2 = /* (includes-not) const |>8*/ /*~~*/'cc2'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,constNonstandard2) skipFixes()) */ satisfies Css<{ color: 'red' }>

const constNonstandard3 = {
  bb3: /* (includes-not) const |>8*/ /*~~*/'cc3'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,constNonstandard3/bb3) skipFixes()) */ satisfies Css<{ color: 'red' }>,
}

console.log(constNonstandard1, constNonstandard2, constNonstandard3)
