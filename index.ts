import type * as CSS from 'csstype'

export type CssObject = CSS.Properties<string | number> | {
  [p in string] : CssObject | PlainProperty | PlainProperty[]
}

type PlainProperty = string | number | boolean | null | undefined

/**
 * Placeholder type for CSS object. Usage:
 * 
 * ```typescript
 * const [root, light] = ['root', 'light'] satisfies Css<{
 *   color: '#ccc'
 *   '&.l': {
 *     color: '#fff'
 *   }
 * }>
 * ```
 * 
 * @see [README.md](README.md)
 */
export type Css<_T extends CssObject> = string | (string|undefined)[] | Record<string, unknown> | { __typiqueCssBrand: any }

/**
 * Type to indicate a CSS variable. Usage:
 * 
 * ```typescript
 * const w = '--width' satisfies Var
 * declare const w: Var<'--width'>
 * const [bgColorVar, spaceVar] = ['--bgColor', '--space'] satisfies Var
 * Or even arrange them as objects with your own helper.
 * `themeObject` returns e.g.: {bgColor: '--th-bgColor', space: '--th-space'}
 * const theme = themeObject(['bgColor', 'space']) satisfies Var
 * ```
 * @see [README.md](README.md)
 */
export type Var<T = any> = T
