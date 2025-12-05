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
  cardDoneColor: '--theme-card-done-color',
  cardBg: '--theme-card-bg',
  btBg: '--theme-bt-bg',
  btBgHover: '--theme-bg-hover',
  cardFg: '--theme-card-fg',
  focusBrd: '--theme-focus-brd',
} as const satisfies Var

[] satisfies Css<{
  body: {
    color: `var(${typeof themeVars.color})`
    background: `var(${typeof themeVars.bg})`

    [themeVars.bg]: '#fff'
    [themeVars.color]: '#000'
    [themeVars.cardDoneColor]: '#333'
    [themeVars.cardBg]: '#eee'
    [themeVars.btBg]: '#eee'
    [themeVars.focusBrd]: '#0006'

    '@media (prefers-color-scheme: dark)': {
      [themeVars.bg]: '#000'
      [themeVars.color]: '#eee'
      [themeVars.cardDoneColor]: '#9b9'
      [themeVars.cardBg]: '#222'
      [themeVars.btBg]: '#444'
      [themeVars.btBgHover]: '#555'
      [themeVars.focusBrd]: '#fffa'
    }
  }
}>

