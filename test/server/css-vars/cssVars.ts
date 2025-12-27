import type { Css, Var } from 'typique'

const v1Var = '--v1' satisfies Var
const v2Var = '--v2' satisfies Var

const themeA = {
  t1: '--th-a-t1',
  t2: '--th-a-t2',
} as const satisfies Var

const themeB = {
  r1: '--th-b-r1',
  r2: '--th-b-r2',
} as const satisfies Var

const themeClassName = 'theme-0' satisfies Css<{
  [v1Var]: 'red'
  [v2Var]: 'blue'
  'font-family': '"Open Sans"'
  [themeA.t1]: 'cyan'
  [themeA.t2]: 'magenta'
  margin: 1
  [themeB.r1]: 'teal'
  [themeB.r2]: 'yellow'
}>

console.log(themeClassName)
