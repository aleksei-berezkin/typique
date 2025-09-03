import type {Css} from 'typique'

[] satisfies Css<{
  /*~~*/color/*~~*/: 'red'
  /*~~*/'&.$1'/*~~*/: {
    color: 'orange'
  }
}>
