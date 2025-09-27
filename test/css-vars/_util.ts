export function themeObject<
  Prefix extends string,
  const VarNames extends string[],
>(prefix: Prefix, ...varNames: VarNames): {[name in VarNames[number]]: name extends string ? `--${Prefix}-${name}` : never} {
  return Object.fromEntries(varNames.map(name => [name, `--${prefix}-${name}`])) as any
}
