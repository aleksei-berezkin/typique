/**
 * Create global CSS. Usage:
 *
 * ```typescript
 * css() satisfies Css<{
 *  color: '#ccc'
 * }>
 * ```
 * @see [README.md](README.md)
 */
export function css(): void

/**
 * Create CSS and generate classnames. Usage:
 *
 * ```typescript
 * const [root, light] = css() satisfies Css<{
 *   color: '#ccc'
 *   '&.l': {
 *     color: '#fff'
 *   }
 * }>
 * ```
 * @see [README.md](README.md)
 */
export function css(label: string): IterableIterator<string>

export function* css(label?: string): IterableIterator<string> {
  if (label != null)
    for (let index = 0; index < 99; index++)
      yield `${label}-${index}`
}

/**
 * Placeholder type for CSS object.
 * @see [README.md](README.md)
 */
export type Css<_T extends object> = string | (string|undefined)[] | { __laimCssBrand: any }

/**
 * Create a CSS variable name. Usage:
 *
 * ```typescript
 * const color = cssVar('color')
 * ```
 * @see [README.md](README.md)
 */
export function cssVar<L extends string>(label: L) {
  return `--${label}` as const
}

/**
 * Create a compile-time CSS variable name. Usage:
 *
 * ```typescript
 * declare const color: CssVar('color')
 * ```
 * @see [README.md](README.md)
 */
export type CssVar<L extends string> = ReturnType<typeof cssVar<L>>

/**
 * Create CSS variables object. Usage:
 *
 * ```typescript
 * const colors = cssVars('color', ['primary', 'secondary'])
 * const {primary, secondary} = colors
 * ```
 * @see [README.md](README.md)
 */
export function cssVars<
  L extends string,
  const N extends string[]
>(label: L, names: N): {
  [n in N[number]]: n extends string ? `--${L}-${n}` : never
} {
  return Object.fromEntries(names.map(name => [name, `--${label}-${name}`])) as any
}

/**
 * Create CSS variables compile-time object. Usage:
 *
 * ```typescript
 * declare const colors: CssVars('color', ['primary', 'secondary'])
 * ```
 * @see [README.md](README.md)
 */
export type CssVars<
  L extends string,
  N extends string[],
> = ReturnType<typeof cssVars<L, N>>
