import type {Css} from 'typique'

[] satisfies Css<{
  /*~~*/color/*~~ tupleHasNoElement{[]; 0; 0} */: 'red'
  /*~~*/'&.$1'/*~~ tupleHasNoElement{[]; 0; 1}*/: {
    color: 'orange'
  }
}>
