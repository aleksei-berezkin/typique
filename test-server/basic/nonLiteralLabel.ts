import {type Css} from 'typique'

const prefix = 'pref'

const cn = `${prefix}-a` satisfies Css<{
  color: 'red'
}>

// TODO this shouldn't output .undefined in css, maybe better not to output at all
const cn2 = (() => { return `${prefix}-b` as const })() satisfies Css<{
  color: 'blue'
}>

console.log(cn, cn2)
