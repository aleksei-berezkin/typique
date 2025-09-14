import {type Css, type Var} from 'typique'

declare const themeVars: Var<{
  color: '--theme-color'
  bgColor: '--theme-bgColor'
  name: '--theme-name'
}>

type Light<Name extends string = '🖥️'> = {
  [themeVars.color]: '#333'
  [themeVars.bgColor]: '#fff'
  [themeVars.name]: `"${Name}"`
}
type Dark<Name extends string = '🖥️'> = {
  [themeVars.color]: '#eee'
  [themeVars.bgColor]: '#444'
  [themeVars.name]: `"${Name}"`
}

const [pageLight, pageDark] = ['page-light', 'page-dark'] satisfies Css<{
  body: Light
  '@media (prefers-color-scheme: dark)': {
    body: Dark
  }
  'body.$0': Light<'☀️'>
  'body.$1': Dark<'🌙'>
}>

console.log(pageLight, pageDark)
