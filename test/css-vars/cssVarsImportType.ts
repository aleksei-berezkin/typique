import { type Css } from 'typique'
import { type globalThemeVars } from './_cssVarsExportType.ts'

const cn = 'cn' satisfies Css<{
  [globalThemeVars.color]: '#333'
  [globalThemeVars.bgColor]: '#fff'
}>

console.log(cn)
