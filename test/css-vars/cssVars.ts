import type { Css, Var } from 'typique'
import { themeObject } from './util.ts'

// TODO doesn't check uniqueness so far

const v1Var = '--v1' satisfies Var
declare const v2Var: Var<'--v2'>

const theme = themeObject('th-a', 't1', 't2')
declare const Theme: ReturnType<typeof themeObject<'th-b', ['r1', 'r2']>>

const className = 'root-c' satisfies Css<{
  [v1Var]: 'red'
  [v2Var]: 'blue'
  'font-family': '"Open Sans"'
  [theme.t1]: 'cyan'
  [theme.t2]: 'magenta'
  margin: 1
  [Theme.r1]: 'teal'
  [Theme.r2]: 'yellow'
}>

console.log(className)
