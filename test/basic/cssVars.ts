import {css, cssVar, cssVars, type Css, type CssVar, type CssVars} from 'laim'

const v1 = cssVar('v1')
declare const v2: CssVar<'v2'>

const theme = cssVars('th-a', ['t1', 't2'])
declare const Theme: CssVars<'th-b', ['r1', 'r2']>

const [cn] = css('root-c') satisfies Css<{
  [v1]: 'red'
  [v2]: 'blue'
  'font-family': '"Open Sans"'
  [theme.t1]: 'cyan'
  [theme.t2]: 'magenta'
  margin: 1
  [Theme.r1]: 'teal'
  [Theme.r2]: 'yellow'
}>

console.log(cn)
