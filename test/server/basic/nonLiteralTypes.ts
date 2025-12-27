import type {Css} from 'typique'

const intersectionClass = 'intersection' satisfies Css<{
  margin: 0
} & {
  padding: 0
}>

type Button<Bg extends string> = {
  backgroundColor: Bg
}

const complexButtonClass = 'complex-button' satisfies Css<
  Button<'red'> & {
    padding: 0
  }
>

const mappedClass = 'mapped' satisfies Css<{
  [p in 'padding' | 'margin']: 0
}>

console.log(intersectionClass, complexButtonClass, mappedClass)
