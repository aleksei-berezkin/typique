import type { Css, Var } from 'typique';

const myXVar = '--my-x' satisfies Var
type MyXVar = typeof myXVar

const myYVar = '--my-y' satisfies Var
type MyYVar = typeof myYVar

const myXClass = 'my-x' satisfies Css<{
  [_ in MyXVar]: 'red'
} & {
  [_ in MyYVar]: 'blue'
} & {
  backgroundColor: `var${MyXVar}`
  color: `var(${MyYVar})`
}>

console.log(myXClass)
