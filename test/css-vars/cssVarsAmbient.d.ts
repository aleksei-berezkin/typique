import {themeObject} from './util.ts'

declare global {
  const globalTheme: ReturnType<typeof themeObject<'theme', ['color', 'bgColor']>>
}

export {}
