import type { Css/*⬅️ ', Var' */ } from 'typique'
const objNotationUpdateImportVar = {
  lg: /* (first-eq) --obj-notation-update-import-lg |>1*/''
}/*⬅️ ' as const satisfies Var' */

const fooClass = 'foo' satisfies Css<{color: 'red'}>

console.log(objNotationUpdateImportVar, fooClass)
