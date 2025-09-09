import type {Css} from 'typique'

[] satisfies Css<{
  // TODO [""] is wrong, must be []
  /*~~*/color/*~~ tupleHasNoElement{[""]; 0; 0} */: 'red'
  /*~~*/'&.$1'/*~~ tupleHasNoElement{[""]; 0; 1}*/: {
    color: 'orange'
  }
}>
