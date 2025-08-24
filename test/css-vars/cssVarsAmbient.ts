/// <reference path="./cssVarsAmbient.d.ts" />

import {type Css} from 'typique'

const cn = 'theme' satisfies Css<{
  [globalTheme.color]: '#333'
  [globalTheme.bgColor]: '#fff'
}>

console.log(cn)
