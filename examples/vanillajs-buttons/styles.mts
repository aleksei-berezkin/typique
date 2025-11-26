// TODO when first line is export const aClass = '', should insert `import` before this line
// TODO In general should not insert import on the same line

// TODO check if `typescript` and `typique` must be in the same `node_modules`

// TODO "module": "esnext" leads to no completion -- probably because it's not compatible with `.mts`

import type { Css, Var } from 'typique'

const themeVars = {
  bgColor0: '--theme-bg-color0',
  bgColor1: '--theme-bg-color1',

  btBgColor: '--theme-bt-bg-color',
  btBgHoverColor: '--theme-bt-bg-hover-color',
  btBgActiveColor: '--theme-bt-bg-active-color',
  btFgColor: '--theme-fg-color',
  btShadowColor: '--theme-bt-shadow-color',

  secBgColor: '--theme-sec-bg-color',
  secBgHoverColor: '--theme-sec-bg-hover-color',
  secBgActiveColor: '--theme-sec-bg-active-color',
  secFgColor: '--theme-sec-fg-color',

  tx: '--theme-tx'
} as const satisfies Var

type Theme = typeof themeVars

[] satisfies Css<{
  'html, body': {
    margin: 0
    padding: 0
    height: '100%'
    width: '100%'
  }

  body: {
    alignItems: 'center'
    background: `linear-gradient(140deg, var(${Theme['bgColor0']}), var(${Theme['bgColor1']}))`
    boxSizing: 'border-box'
    display: 'flex'
    flexDirection: 'column'
    gap: '1em'
    justifyContent: 'center'
    padding: '1em'

    // https://coolors.co/060a0e-344966-b4cded-f0f4ef-bfcc94

    [themeVars.bgColor0]: '#F1F5F9'
    [themeVars.bgColor1]: '#9CB8D3'

    [themeVars.btBgColor]: '#516D4A'
    [themeVars.btFgColor]: '#040910'
    [themeVars.btShadowColor]: 'rgb(60 64 67 / 40%)'

    [themeVars.tx]: '200ms'

    '@media (prefers-color-scheme: dark)': {
      [themeVars.bgColor0]: '#294A66'
      [themeVars.bgColor1]: '#060A0E'

      [themeVars.btBgColor]: '#ADC8EB'
      [themeVars.btBgHoverColor]: '#7CA7DF'
      [themeVars.btBgActiveColor]: '#2C67B5'
      [themeVars.btFgColor]: '#142F52'
    [themeVars.btShadowColor]: 'rgb(60 64 67 / 80%)'

      [themeVars.secBgColor]: '#AEC6A9'
      [themeVars.secBgHoverColor]: '#7FA578'
      [themeVars.secBgActiveColor]: '#466241'
      [themeVars.secFgColor]: '#233043'
    }
  }
}>

export const hoverXVar = '--hover-x' satisfies Var
export const hoverYVar = '--hover-y' satisfies Var

const c0 = '--c0' satisfies Var
const c1 = '--c1' satisfies Var

export const buttonClass = 'button' satisfies Css<{
  // TODO Should work with {} & {} at top level
  '&': {
    [c in `@property ${typeof c0 | typeof c1}`]: {
      syntax: '"<color>"'
      initialValue: '#888'
      inherits: false
    }
  }

  borderRadius: '.25em'
  cursor: 'pointer'
  fontFamily: 'Verdana, Arial, sans-serif'
  fontSize: '18px'
  letterSpacing: '.05em'
  padding: '.5em'
  textTransform: 'uppercase'
  transition: `${typeof c0} var(${Theme['tx']}),
    ${typeof c1} var(${Theme['tx']})`
}>

export const primaryClass = 'primary' satisfies Css<{
  // TODO: without &, pass generic type right away
  '&': SolidButtonStyle<Theme['btFgColor'], Theme['btBgColor'], Theme['btBgHoverColor'], Theme['btBgActiveColor']>
}>

export const secondaryClass = 'secondary' satisfies Css<{
  '&': SolidButtonStyle<Theme['secFgColor'], Theme['secBgColor'], Theme['secBgHoverColor'], Theme['secBgActiveColor']>
}>

type SolidButtonStyle<
  Color extends string,
  Bg extends string,
  HoverBg extends string,
  ActiveBg extends string,
> = {
  // TODO via &-ed mapped type
  [hoverXVar]: '50%'
  [hoverYVar]: '50%'

  background: `radial-gradient(
    circle at var(${typeof hoverXVar}) var(${typeof hoverYVar}),
    var(${typeof c0}) 0%,
    var(${typeof c1}) 100%
  )`
  border: 'none'
  boxShadow: `3px 0 6px 0px var(${Theme['btShadowColor']}), -1px 4px 8px 1px var(${Theme['btShadowColor']})`
  color: `var(${Color})`

  [c0]: `var(${Bg})`
  [c1]: `var(${typeof c0})`
  '&:hover, &:active': {
    [c0]: `var(${HoverBg})`
  }
  '&:active': {
    [c1]: `var(${ActiveBg})`
  }
}

export const primaryOutlinedClass = 'primary-outlined' satisfies Css<{
  '&': OutlinedButtonStyle<Theme['btBgColor'], Theme['btBgHoverColor'], Theme['btBgActiveColor']>
}>

export const secondaryOutlinedClass = 'secondary-outlined' satisfies Css<{
  '&': OutlinedButtonStyle<Theme['secBgColor'], Theme['secBgHoverColor'], Theme['secBgActiveColor']>
}>

type OutlinedButtonStyle<
  Color extends string,
  Hover extends string,
  Active extends string,
> = {
  background: `transparent`
  border: `2px solid var(${typeof c0})`
  color: `var(${typeof c0})`

  [c0]: `var(${Color})`
  '&:hover, &:active': {
    [c0]: `var(${Hover})`
  }
  '&:active': {
    [c0]: `var(${Active})`
  }
}
