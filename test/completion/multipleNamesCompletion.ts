import type {Css} from 'typique'

const [rootClass, largeClass, smallClass] = [/*|>1*/'', /*|>1*/'', /*|>1*/'']

const root_Class = 'root' satisfies Css<{ color: 'red' }>

const small_Class = 'small' satisfies Css<{ color: 'blue' }>
const small_0_Class = 'small-0' satisfies Css<{ color: 'cyan' }>

console.log(rootClass, largeClass, smallClass, root_Class, small_Class, small_0_Class)
