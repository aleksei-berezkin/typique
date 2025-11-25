// TODO should insert before
// should not insert import on the same line

// TODO check if typescript and typique must be in the same node_modules

// TODO "module": "esnext" leads to no completion

import type { Css, Var } from 'typique'

const themeVars = {
  bgColor0: '--theme-bg-color0',
  bgColor1: '--theme-bg-color1',
  btBgColor: '--theme-bt-bg-color',
  fgColor: '--theme-fg-color',
} as const satisfies Var

type Theme = typeof themeVars

[] satisfies Css<{
  'html, body': {
    margin: 0
    padding: 0
    height: '100%'
    width: '100%'
  }

  // https://coolors.co/060a0e-344966-b4cded-f0f4ef-bfcc94
  body: {
    alignItems: 'center'
    display: 'flex'
    gap: '1em'
    flexDirection: 'column'
    justifyContent: 'center'
    background: `linear-gradient(140deg, var(${Theme['bgColor0']}), var(${Theme['bgColor1']}))`
    [themeVars.bgColor0]: '#F1F5F9'
    [themeVars.bgColor1]: '#9CB8D3'
    [themeVars.btBgColor]: '#516D4A'
    [themeVars.fgColor]: '#040910'
    '@media (prefers-color-scheme: dark)': {
      [themeVars.bgColor0]: '#294A66'
      [themeVars.bgColor1]: '#060A0E'
      [themeVars.btBgColor]: '#A4BD9E'
      [themeVars.fgColor]: '#EFF4FB'
    }
  }
}>

export const buttonClass = 'button' satisfies Css<{
  backgroundColor: `var(${Theme['btBgColor']})`
  border: 'none'
  borderRadius: '.25em'
  fontFamily: 'Arial, sans-serif'
  fontSize: '18px'
  padding: '.5em'
}>
