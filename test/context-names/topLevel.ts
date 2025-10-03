import type {Css} from 'typique'


/*|>8*/ /*~~*/'tt1'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */ satisfies Css<{ color: 'red' }>

console.log(/*|>8*/ /*~~*/'tt2'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */ satisfies Css<{ color: 'red' }>)

await (/*|>8*/ /*~~*/'tt3'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */ satisfies Css<{ color: 'red' }>)

void (/*|>8*/ /*~~*/'tt4'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */ satisfies Css<{ color: 'red' }>)

for (const loopParam of [/* (includes-not) loop |>8*/ /*~~*/'tt5'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */, /* (includes-not) loop |>8*/ /*~~*/'tt6'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cn) skipFixes()) */] satisfies Css<{ color: 'red', '$1': { color: 'blue' }}>) {
  console.log(loopParam)
}

console.log({
  bb7: /* (includes-not) bb |>8*/ /*~~*/'tt7'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,bb7) skipFixes()) */ satisfies Css<{ color: 'red' }>,
  cc7: {
    dd7: /* (includes-not) dd |>8*/ /*~~*/'tt8'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cc7/dd7) skipFixes()) */ satisfies Css<{ color: 'red' }>,
  }
})
