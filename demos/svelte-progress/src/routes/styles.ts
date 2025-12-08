/*
TODO
 No Satisfies Var in this example:
 import type { Css } from 'typique'

const themeVars = {
  bg: (here)
}


export const aClass = 'a__xj66' satisfies Css<{
  color: 'red'
}>
 */

import type { Css, Var } from 'typique'

const themeVars = {
  bg: '--theme-bg__ftYb',
  fg: '--theme-fg__sJSJ',
} as const satisfies Var

[] satisfies Css<{
  'html, body': {
    height: '100%'
    margin: 0
    padding: 0
    width: '100%'
  }
  main: {
    alignItems: 'center'
    backgroundColor: `var(${typeof themeVars.bg})`
    color: `var(${typeof themeVars.fg})`
    display: 'flex'
    flexDirection: 'column'
    justifyContent: 'center'
    height: '100%'
    width: '100%'

    [themeVars.bg]: '#fff'
    [themeVars.fg]: '#333'
    '@media (prefers-color-scheme: dark)': {
      [themeVars.bg]: '#333'
      [themeVars.fg]: '#fffe'
    }
  }
}>

export const svgClass = 'svg__D4Gn' satisfies Css<{
  maxWidth: 'calc(min(150px, 70vw))'
}>

export const r = 20
export const strokeWidth = 3.5
export const viewBox = `-${r + strokeWidth/2} -${r + strokeWidth/2} ${2 * (r + strokeWidth/2)} ${2 * (r + strokeWidth/2)}`

const lVar = '--l__jlp2' satisfies Var
// Percent to avoid messing up with 0.2 + 0.1 = 0.299999
export const progressPercentVar = '--progress-percent__HB0n' satisfies Var

export const mainCircleClass = 'main-circle__jLrN' satisfies Css<{
  [lVar]: `calc(2 * 3.14159 * ${typeof r})`
  [progressPercentVar]: '40'
  strokeDasharray: `var(${typeof lVar})`
  strokeDashoffset: `calc(var(${typeof lVar}) * 0.01 * (100 - var(${typeof progressPercentVar})))`
  transform: 'rotate(-90deg)'
  transition: 'stroke-dashoffset 200ms ease-out'
}>

const rejectScaleDeltaVar = '--reject-scale-delta__BXC1' satisfies Var

// TODO here, keyframes name was not generated
export const [rejectAnimationClass, rejectDown, ] = ['reject-animation__JHnk', 'down__wpRu', 'cn__lhTz'] satisfies Css<{
  [rejectScaleDeltaVar]: '0.08'
  '.$1': {
    [rejectScaleDeltaVar]: '-0.08'
  }
  animation: `$2 300ms ease-out forwards`
  '@keyframes $2': {
    from: {
      transform: `scale(calc(1 + var(${typeof rejectScaleDeltaVar})))`
    }
    to: {
      transform: 'scale(1)'
    }
  }
}>

export const bgCircleClass = 'bg-circle__7UmT' satisfies Css<{
  opacity: '.1'
}>

export const buttonsContainerClass = 'buttons-container__7UmT' satisfies Css<{
  marginTop: '1em'
  '& > button': {
    fontSize: '1.5em'
    '&:not(:last-child)': {
      marginRight: '1rem'
    }
  }
}>
