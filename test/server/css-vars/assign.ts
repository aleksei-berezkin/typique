import type { Css, Var } from 'typique';

const themeVar = {
  col: '--theme-col',
  bg: '--theme-bg',
} as const satisfies Var

type Theme = typeof themeVar

/**
 * Assign
 */
type Assign<
  Theme extends Record<string, string>,
  K0 extends keyof Theme | '' = '', V0 = never,
  K1 extends keyof Theme | '' = '', V1 = never,
  K2 extends keyof Theme | '' = '', V2 = never,
> =
  & (K0 extends '' ? {} : {[_ in Theme[K0]]: V0})
  & (K1 extends '' ? {} : {[_ in Theme[K1]]: V1})
  & (K2 extends '' ? {} : {[_ in Theme[K2]]: V2})

const myAssignedClass = 'my-assigned' satisfies Css<
  Assign<Theme,
    'col', '#000',
    'bg', '#fff'
  > & {
    color: `var(${Theme['col']})`
    background: `var(${Theme['bg']})`
  }
>

console.log(myAssignedClass)
