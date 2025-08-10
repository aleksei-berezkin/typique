import {CssVars} from '../../index.ts'

declare global {
  const globalTheme: CssVars<'theme', ['color', 'bgColor']>
}

export {}
