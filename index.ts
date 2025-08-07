export function css(): void
export function css(label: string): IterableIterator<string>
export function* css(label?: string): IterableIterator<string> {
  if (label != null)
    for (let index = 0; index < 99; index++)
      yield `${label}-${index++}`
}

export type Css<_T extends object> = any

export function getVarNames<
  Names extends string[],
>(label: string, names: Names): GetVarNames<Names> {
    return Object.fromEntries(names.map(name => [name, `--${getPrefix()}${label}-${name}`])) as GetVarNames<Names>
}

export type GetVarNames<Names extends string[]> = {
  [name in Names[number]]: string
}
