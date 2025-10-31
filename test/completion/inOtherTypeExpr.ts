/*↙️ "import type { Css } from 'typique'\n" */
const myInOtherClass = /* (first-eq) my-in-other |>1*/'' satisfies string

const myInOtherAsClass = /* (first-eq) my-in-other-as |>1*/'my-in-other-as' as string

console.log(myInOtherClass, myInOtherAsClass)

export {}
