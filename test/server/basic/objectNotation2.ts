import type {Css} from 'typique'

const objClasses = {
  main: {
    rd: 'obj-main-rd',
    bl: 'obj-main-bl',
  } satisfies Css<{
    color: 'red'
    '& .$bl': {
      color: 'blue'
    }
  }>,
  bt: {
    lg: 'obj-bt-lg' satisfies Css<{
      padding: 1
    }>,
    sm: 'obj-bt-sm' satisfies Css<{
      padding: 2
    }>,
  }
}

console.log(objClasses)
