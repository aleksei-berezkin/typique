import type {Css} from 'typique'

const objClasses = {
  root: /* obj-root root-0 |>1*/'',
  sz: {
    sm: /* obj-sz-sm sz-sm sm-0 |>1*/'',
  },
} satisfies Css<{
}>


console.log(objClasses)
