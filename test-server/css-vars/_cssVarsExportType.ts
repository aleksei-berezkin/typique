import type { Var } from 'typique'

const globalThemeVars = {
  color: '--theme-color',
  bgColor: '--theme-bgColor'
} as const satisfies Var

export { globalThemeVars }
