import type {Css} from 'typique'

declare const prop: 'a' | 'b' | 'c' | 'd'

const inCcClass = cc(
  prop === /* (includes-not) in-cc |>1*/'a' && 'in-cc' satisfies Css<{color: 'red'}>,
  prop !== /* (includes-not) in-cc |>1*/'b' && 'in-cc-0' satisfies Css<{color: 'blue'}>,
  prop != /* (includes-not) in-cc |>1*/'c' && 'in-cc-1' satisfies Css<{color: 'white'}>,
  prop == /* (includes-not) in-cc |>1*/'d' && 'in-cc-2' satisfies Css<{color: 'green'}>,
)

console.log(inCcClass)

function cc(...classNames: string[]) {
  return classNames.join(' ')
}
