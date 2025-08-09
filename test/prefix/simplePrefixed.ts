import {css, type Css, cssVar, type CssVar, cssVars, type CssVars} from 'laim'

const v1 = cssVar('v1')
declare const v2: CssVar<'v2'>

const theme = cssVars('th-a', ['t1', 't2'])
declare const Theme: CssVars<'th-b', ['r1', 'r2']>

const [cn, highlighted] = css('root') satisfies Css<{
  [v1]: 'red'
  [v2]: 'blue'
  [theme.t1]: 'cyan'
  [theme.t2]: 'magenta'
  [Theme.r1]: 'teal'
  [Theme.r2]: 'yellow'
  '.highlight': {
    [v1]: 'coral'
  }
}>

console.log(cn, highlighted)
