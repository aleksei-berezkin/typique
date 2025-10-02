import type {Css} from 'typique'

function NonstandardComp0() {
  // No error
  return `<div> class=${ 'abc' }</div>`
}

function NonstandardComp1() {
  return `<div> class=${ /*~~*/'aa1'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,NonstandardComp1) skipFixes()) */ satisfies Css<{ color: 'red' }> }</div>`
}

const nonstandardComp2 = `<div> class=${ /*~~*/'aa2'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,nonstandardComp2) skipFixes()) */ satisfies Css<{ color: 'red' }> }</div>`

const nonstandardComp3 = /*~~*/'aa3'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,nonstandardComp3) skipFixes()) */ satisfies Css<{ color: 'red' }>

const nonstandardComp4 = () => /*~~*/'aa4'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,nonstandardComp4) skipFixes()) */ satisfies Css<{ color: 'red' }>

/*~~*/'aa5'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */ satisfies Css<{ color: 'red' }>

console.log(/*~~*/'aa6'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */ satisfies Css<{ color: 'red' }>)

await (/*~~*/'aa7'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */ satisfies Css<{ color: 'red' }>)

void (/*~~*/'aa8'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */ satisfies Css<{ color: 'red' }>)

for (const c of [/*~~*/'aa9'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */, /*~~*/'aa10'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */] satisfies Css<{ color: 'red', '$1': { color: 'blue' }}>) {
  console.log(c)
}

const nonstandardComp11 = {
  bb11: /*~~*/'aa11'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,nonstandardComp11/bb11) skipFixes()) */ satisfies Css<{ color: 'red' }>,
}

console.log({
  bb12: /*~~*/'aa12'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,bb12) skipFixes()) */ satisfies Css<{ color: 'red' }>,
  cc12: {
    dd12: /*~~*/'aa122'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cc12/dd12) skipFixes()) */ satisfies Css<{ color: 'red' }>,
  }
})

console.log(NonstandardComp0, NonstandardComp1, nonstandardComp2, nonstandardComp3, nonstandardComp4, nonstandardComp11)
