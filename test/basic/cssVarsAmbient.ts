/// <reference path="./cssVarsAmbient.d.ts" />

import {css, type Css} from 'laim'

const [cn] = css('theme') satisfies Css<{
  [globalTheme.color]: '#333'
  [globalTheme.bgColor]: '#fff'
}>

console.log(cn)
