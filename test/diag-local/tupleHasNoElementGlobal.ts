import type {Css} from 'typique'

[] satisfies Css<{
  /*~~*/color/*~~ tupleHasNoElement(msg('[]', 0, 0)) */: 'red'
  /*~~*/'&.$1'/*~~ tupleHasNoElement(msg('[]', 0, 1))*/: {
    color: 'orange'
  }
}>
