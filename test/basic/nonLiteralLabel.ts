import {type Css} from 'typique'

const prefix = 'pref'

const cn = `${prefix}-a` satisfies Css<{
  color: 'red'
}>

const cn2 = (() => { return `${prefix}-b` as const })() satisfies Css<{
  color: 'blue'
}>

console.log(cn, cn2)
