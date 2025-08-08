import {css as _css, cssVar as _cssVar, cssVars as _cssVars} from '../../index.ts'

const prefix = 'my-'

export function* css(label: string) {
  for (const c of _css(label))
    yield `${prefix}${c}`
}
export type Css<_T extends object> = any

export function cssVar<L extends string>(label: L) {
  return _cssVar(`${prefix}${label}`)
}
export type CssVar<L extends string> = ReturnType<typeof cssVar<L>>

export function cssVars<
  L extends string,
  const N extends string[]
>(label: L, names: N) {
  return _cssVars(`${prefix}${label}`, names)
}
export type CssVars<L extends string, N extends string[]> = ReturnType<typeof cssVars<L, N>>
