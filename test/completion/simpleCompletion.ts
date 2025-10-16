import type {Css} from 'typique'

const userPicClassName = /* user-pic-2 user pic-0 |>1*/''

const userPicClass_ = 'user-pic' satisfies Css<{ color: 'red' }>
const userPicClass0 = 'user-pic-0' satisfies Css<{ color: 'blue' }>
const userPicClass1 = 'user-pic-1' satisfies Css<{ color: 'cyan' }>

const picClass = 'pic' satisfies Css<{ color: 'magenta' }>
const picClass1 = 'pic1' satisfies Css<{ color: 'orange' }>

console.log(userPicClassName, userPicClass_, userPicClass0, userPicClass1, picClass, picClass1)
