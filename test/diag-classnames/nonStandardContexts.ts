import type {Css} from 'typique'

function NonstandardComp0() {
  // No error
  return `<div> class=${ 'abc' }</div>`
}

function NonstandardComp1() {
  return `<div> class=${ /*~~*/'abc'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,NonstandardComp1) fix(nonstandard-comp1) fix(comp1))*/ satisfies Css<{ color: 'red' }> }</div>`
}


console.log(NonstandardComp0, NonstandardComp1)
