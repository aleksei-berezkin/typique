import type { Css, Var } from 'typique'

const themeVars = {
  bg: '--theme-bg__ftYb',
  fg: '--theme-fg__sJSJ',
  btBg: '--theme-bt-bg__iBTT',
  btBgHover: '--theme-bt-bg-hover__PzEV',
  circleShadowColor: '--theme-circle-shadow-color__62J8',
  btShadowColor: '--theme-bt-shadow-color__FxBN',
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
    [themeVars.btBg]: '#e0e0e0'
    [themeVars.btBgHover]: '#ccc'
    [themeVars.circleShadowColor]: '#000'
    [themeVars.btShadowColor]: 'rgba(0, 0, 0, 0.15)'
    '@media (prefers-color-scheme: dark)': {
      [themeVars.bg]: '#222'
      [themeVars.fg]: '#fffe'
      [themeVars.btBg]: '#505050'
      [themeVars.btBgHover]: '#777'
      [themeVars.circleShadowColor]: '#fff'
      [themeVars.btShadowColor]: 'rgba(255, 255, 255, 0.15)'
    }
  }
}>

export const svgClass = 'svg__D4Gn' satisfies Css<{
  maxWidth: 'calc(min(200px, 90vw))'
}>

export const r = 20
export const strokeWidth = 3.5
const svgPadding = 5 // to give room for shadow
const side = r + strokeWidth/2 + svgPadding
export const viewBox = `-${side} -${side} ${2 * side} ${2 * side}`

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
  filter: `drop-shadow(0 0 2.5px var(${typeof themeVars.circleShadowColor}))`
  opacity: '.15'
}>

export const buttonsContainerClass = 'buttons-container__7UmT' satisfies Css<{
  marginTop: '.5rem'
  '& > button': {
    aspectRatio: '1'
    backgroundColor: `var(${typeof themeVars.btBg})`
    border: 'unset'
    borderRadius: '.3rem'
    cursor: 'pointer'
    filter: `drop-shadow(0 0 3px var(${typeof themeVars.btShadowColor}))`
    fontSize: '1.5rem'
    transition: 'background-color 200ms, transform 100ms ease-out'
    width: '1.7em'
    '&:not(:last-child)': {
      marginRight: '1em'
    }
    '&:hover': {
      backgroundColor: `var(${typeof themeVars.btBgHover})`
    }
    '&:active': {
      transform: 'translate(1px, 1px)'
    }
  }
}>
