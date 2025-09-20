import type {Css} from 'typique'

[] satisfies Css<{
  /*~~*/color/*~~ cannotFind(msg($0)) */: 'red'
  /*~~*/'&.$1'/*~~ cannotFind(msg($1))*/: {
    color: 'orange'
  }
}>
