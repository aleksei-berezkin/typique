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
 * const [bgColorVar, spaceVar] = ['--bgColor', '--space'] satisfies Var
 * const themeVars = {bgColor: '--th-bgColor', space: '--th-space'} satisfies Var
 * ```
 * @see [README.md](README.md)
 */
export type Var = string | string[] | Record<string, unknown>
