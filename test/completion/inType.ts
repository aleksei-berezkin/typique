const myButtonClass = '' satisfies /* (includes_not) button |>1*/''

type Generic<_T> = any

const myButton1Class = '' as Generic</* (includes_not) button |>1*/''>

const myButton2Class = '' satisfies Generic<{
  my: /* (includes_not) button |>1*/''
}>

console.log(myButtonClass, myButton1Class, myButton2Class)

export {}
