import {css, type Css, type CssVars} from 'laim'

declare const theme: CssVars<'theme', ['color', 'bgColor', 'name']>

type Light<Name extends string = '🖥️'> = {
  [theme.color]: '#333'
  [theme.bgColor]: '#fff'
  [theme.name]: `"${Name}"`
}
type Dark<Name extends string = '🖥️'> = {
  [theme.color]: '#eee'
  [theme.bgColor]: '#444'
  [theme.name]: `"${Name}"`
}

const [light, dark] = css('page') satisfies Css<{
  body: Light
  '@media (prefers-color-scheme: dark)': {
    body: Dark
  }
  'body.light': Light<'☀️'>
  'body.dark': Dark<'🌙'>
}>

console.log(light, dark)
