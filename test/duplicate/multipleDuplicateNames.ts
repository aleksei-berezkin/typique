import type {Css} from 'typique'

const [buttonClass, headerClass] = [/*~~*/''/*~~ link::1 fix:button */, /*~~*/''/*~~ type:duplicate type:unused link::0 fix:header */] satisfies Css<{
  color: 'red'
}>

console.log(buttonClass, headerClass)
