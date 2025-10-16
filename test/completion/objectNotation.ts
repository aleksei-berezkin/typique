import type {Css} from 'typique'

const objClasses = {
  root: /* obj-root root-0 obj |>1*/'',
  sz: {
    sm: /* obj-sz-sm obj-sm obj-sz obj sm-0 |>1*/'',
  },
} satisfies Css<{
}>


console.log(objClasses)
