const myButtonClass = '' satisfies /* (includes-not) button |>,1*/''

type Generic<_T> = any

const myButton1Class = '' as Generic</* (includes-not) button |>,1*/''>

const myButton2Class = '' satisfies Generic<{
  my: /* (includes-not) button |>,1*/''
}>

console.log(myButtonClass, myButton1Class, myButton2Class)

export {}
