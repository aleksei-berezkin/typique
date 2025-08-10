import {css, type Css, type CssVars} from 'laim'

declare const theme: CssVars<'theme', ['color', 'bgColor']>

type Light = {
  [theme.color]: '#333'
  [theme.bgColor]: '#fff'
}
type Dark = {
  [theme.color]: '#eee'
  [theme.bgColor]: '#444'
}

const [light, dark] = css('page') satisfies Css<{
  body: Light
  '@media (prefers-color-scheme: dark)': {
    body: Dark
  }
  'body.light': Light
  'body.dark': Dark
}>

console.log(light, dark)
