/*
TODO problems with adding import when only following content:
export const themeVars = {
  bg: 
}
*/
import type { Css, Var } from 'typique' 

export const themeVars = {
  bg: '--theme-bg',
  color: '--theme-color',
  cardBg: '--theme-card-bg',
  cardFg: '--theme-card-fg',
  cardFocusBrd: '--theme-card-focus-brd',
} as const satisfies Var

[] satisfies Css<{
  body: {
    color: `var(${typeof themeVars.color})`
    background: `var(${typeof themeVars.bg})`

    [themeVars.bg]: '#fff'
    [themeVars.color]: '#000'
    [themeVars.cardBg]: '#eee'
    [themeVars.cardFocusBrd]: '#0006'

    '@media (prefers-color-scheme: dark)': {
      [themeVars.bg]: '#000'
      [themeVars.color]: '#eee'
      [themeVars.cardBg]: '#222'
      [themeVars.cardFocusBrd]: '#fff6'
    }
  }
}>
