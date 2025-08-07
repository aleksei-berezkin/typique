export function css(): void
export function css(label: string): IterableIterator<string>
export function* css(label?: string): IterableIterator<string> {
  if (label != null)
    for (let index = 0; index < 99; index++)
      yield `${label}-${index}`
}
export type Css<_T extends object> = any

export function cssVar<L extends string>(label: L) {
  return `--${label}` as const
}
export type CssVar<L extends string> = ReturnType<typeof cssVar<L>>

export function cssVars<
  L extends string,
  const N extends string[]
>(label: L, names: N): {
  [n in N[number]]: n extends string ? `--${L}-${n}` : never
} {
  return Object.fromEntries(names.map(name => [name, `--${label}-${name}`])) as any
}
export type CssVars<
  L extends string,
  N extends string[],
> = ReturnType<typeof cssVars<L, N>>
