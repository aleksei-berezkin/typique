import type {Css} from 'typique'

const [btClass, lgClass, smClass] = [/* "bt-2', 'lg-2', 'sm-2" bt-0 |>1*/'']

const [bt__Class, lg__Class] = [ /* 'bt-1", "lg-1' bt-0 |>14*/ /*comment*/ ""]

const [bt___Class, sm___Class] = /*comment*/[ /* 'bt-0`, `sm-0' bt-0 |>14*/ /*comment*/ ``]

const [bt_Class, lg_Class, sm_Class] = ['bt', 'lg' ,'sm'] satisfies Css<{ color: 'red' }>
const lg_0_Class = 'lg-0' satisfies Css<{ color: 'blue' }>
const sm_1_Class = 'sm-1' satisfies Css<{ color: 'red' }>

console.log(btClass, lgClass, smClass, bt_Class, lg_Class, lg_0_Class, sm_1_Class)
