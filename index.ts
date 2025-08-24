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
export type Css<_T extends object> = string | (string|undefined)[] | { __typiqueCssBrand: any }

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
