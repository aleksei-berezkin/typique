import type {Css} from 'typique'

const [btClass, lgClass, smClass] = [''/*1<|*/]

const [bt__Class, lg__Class] = [ /*comment*/ ""/*1<|*/]
const [bt___Class, sm___Class] = /*comment*/[ /*comment*/ ``/*1<|*/]

const [bt_Class, lg_Class, sm_Class] = ['bt', 'lg' ,'sm'] satisfies Css<{ color: 'red' }>
const lg_0_Class = 'lg-0' satisfies Css<{ color: 'blue' }>
const sm_1_Class = 'sm-1' satisfies Css<{ color: 'red' }>

console.log(btClass, lgClass, smClass, bt_Class, lg_Class, lg_0_Class, sm_1_Class)
