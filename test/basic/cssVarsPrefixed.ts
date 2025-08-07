import {css, cssVar, cssVars, type Css, type CssVar, type CssVars} from 'laim'

function cssVarPrefixed<L extends string>(label: L) {
  return cssVar(`p1-${label}`)
}
type CssVarPrefixed<L extends string> = ReturnType<typeof cssVarPrefixed<L>>

function cssVarsPrefixed<
  L extends string,
  const N extends string[]
>(label: L, names: N) {
  return cssVars(`p2-${label}`, names)
}
type CssVarsPrefixed<L extends string, N extends string[]> = ReturnType<typeof cssVarsPrefixed<L, N>>

const v1 = cssVarPrefixed('v1')
declare const v2: CssVarPrefixed<'v2'>

const theme = cssVarsPrefixed('th-a', ['t1', 't2'])
declare const Theme: CssVarsPrefixed<'th-b', ['r1', 'r2']>

const [cn] = css('root-c') satisfies Css<{
  [v1]: 'red'
  [v2]: 'blue'
  [theme.t1]: 'cyan'
  [theme.t2]: 'magenta'
  [Theme.r1]: 'teal'
  [Theme.r2]: 'yellow'
}>

console.log(cn)
