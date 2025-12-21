import type { Css, Var } from 'typique'

const themeVars = {
  bgColor: '--theme-bg-color',
  bgColorLessContrast: '--theme-bg-color-less-contrast',

  primColor: '--theme-prim-color',
  primHoverColor: '--theme-prim-hover-color',
  
  secColor: '--theme-sec-color',
  secHoverColor: '--theme-sec-hover-color',

  btShadowColor: '--theme-bt-shadow-color',

  tx: '--theme-tx'
} as const satisfies Var

type Theme = typeof themeVars

const gradAngleVar = '--grad-angle' satisfies Var

[] satisfies Css<{
  'html, body': {
    margin: 0
    padding: 0
    height: '100%'
    width: '100%'
  }

  body: {
    [gradAngleVar]: '-40deg'

    alignItems: 'center'
    background: `linear-gradient(var(${typeof gradAngleVar}), var(${Theme['bgColorLessContrast']}), var(${Theme['bgColor']}))`
    boxSizing: 'border-box'
    display: 'flex'
    flexDirection: 'column'
    gap: '1em'
    justifyContent: 'center'
    padding: '1em'

    // https://coolors.co/060a0e-344966-b4cded-f0f4ef-bfcc94

    [themeVars.bgColor]: '#fff'
    [themeVars.bgColorLessContrast]: '#9BB8D4'

    [themeVars.primColor]: '#516D4A'
    [themeVars.primHoverColor]: '#63865B'

    [themeVars.secColor]: '#2C67B5'
    [themeVars.secHoverColor]: '#3A7BCF'
    
    [themeVars.btShadowColor]: '#3334'

    [themeVars.tx]: '200ms'

    '@media (prefers-color-scheme: dark)': {
      [gradAngleVar]: '140deg'

      [themeVars.bgColor]: '#060A0E'
      [themeVars.bgColorLessContrast]: '#294A66'

      [themeVars.primColor]: '#ADC8EB'
      [themeVars.primHoverColor]: '#7CA7DF'
      
      [themeVars.secColor]: '#AEC6A9'
      [themeVars.secHoverColor]: '#7FA578'

      [themeVars.btShadowColor]: '#3336'
    }
  }
}>

export const hoverXVar = '--hover-x' satisfies Var
export const hoverYVar = '--hover-y' satisfies Var

const c0 = '--c0' satisfies Var
const c1 = '--c1' satisfies Var

[] satisfies Css<{
  [_ in `@property ${typeof c0 | typeof c1}`]: {
    syntax: '"<color>"'
    initialValue: '#888'
    inherits: false
  }
}>

export const buttonClass = 'button' satisfies Css<{
  borderRadius: '.25em'
  cursor: 'pointer'
  fontFamily: 'Verdana, Arial, sans-serif'
  fontSize: '18px'
  letterSpacing: '.05em'
  padding: '.5em'
  textTransform: 'uppercase'
  transition: `${typeof c0} var(${Theme['tx']}),
    ${typeof c1} var(${Theme['tx']}),
    translate 100ms linear`

  '&:active': {
    translate: '1px 1px'
  }
}>

export const primaryClass = 'primary' satisfies Css<
  SolidButtonStyle<Theme['primColor'], Theme['primHoverColor']>
>

export const secondaryClass = 'secondary' satisfies Css<
  SolidButtonStyle<Theme['secColor'], Theme['secHoverColor']>
>

const grad1ColVar = '--grad1-col' satisfies Var
const grad2ColVar = '--grad2-col' satisfies Var

[] satisfies Css<{
  [_ in `@property ${typeof grad1ColVar | typeof grad2ColVar}`]: {
    syntax: '"<percentage>"'
    initialValue: '0%'
    inherits: false
  }
}>

type SolidButtonStyle<
  Bg extends string,
  Hover extends string,
> = {
  [hoverXVar]: '50%'
  [hoverYVar]: '50%'

  [grad1ColVar]: '0%'
  [grad2ColVar]: '0%'

  background: `radial-gradient(
    circle at var(${typeof hoverXVar}) var(${typeof hoverYVar}),
    var(${typeof c1}) var(${typeof grad1ColVar}),
    var(${typeof c0}) var(${typeof grad2ColVar})
  )`
  border: 'none'
  boxShadow: `3px 0 6px 0px var(${Theme['btShadowColor']}), -1px 4px 8px 1px var(${Theme['btShadowColor']})`
  color: `var(${Theme['bgColor']})`

  // TODO join union - maybe hardcode to join union via comma, or introduce intrinsic Join
  transition: `${typeof grad1ColVar} 100ms ease-out, ${typeof grad2ColVar} 100ms ease-out`

  [c0]: `var(${Bg})`
  [c1]: `var(${typeof c0})`
  '&:hover, &:active': {
    [c0]: `var(${Hover})`
  }
  '&:active': {
    [c1]: `color-mix(in srgb, var(${Hover}) 78%, var(${Theme['bgColor']}))`
    [grad1ColVar]: '100%'
    [grad2ColVar]: '200%'
    transitionDuration: '800ms'
  }
}

export const primaryOutlinedClass = 'primary-outlined' satisfies Css<
  OutlinedButtonStyle<Theme['primColor'], Theme['primHoverColor']>
>

export const secondaryOutlinedClass = 'secondary-outlined' satisfies Css<
  OutlinedButtonStyle<Theme['secColor'], Theme['secHoverColor']>
>

type OutlinedButtonStyle<
  Color extends string,
  Hover extends string,
> = {
  background: `transparent`
  border: `2px solid var(${typeof c0})`
  color: `var(${typeof c0})`

  [c0]: `var(${Color})`
  '&:hover, &:active': {
    [c0]: `var(${Hover})`
  }
  '&:active': {
    [c0]: `color-mix(in srgb, var(${Hover}) 78%, var(${Theme['bgColor']}))`
  }
}
