# Typique

Typique (pronounced /ti'pik/) is a framework- and bundler-agnostic, zero-runtime CSS-in-TS library powered by a TypeScript plugin. It generates readable, unique class and variable names directly as completion items in your editor. Styles exist only as types, so they vanish cleanly from your final build.

## Example

(video)

```ts
import type { Css } from 'typique'
import { space } from './my-const'

const titleClass = 'title' satisfies Css<{
  fontSize: '1.3rem'
  fontWeight: '300'
  padding: `calc(2 * ${typeof space}px)`
  '&:hover': {
    fontWeight: '500'
  }
}>
```

<details>

<summary>What's going on here?</summary>

```ts
import type { Css } from 'typique'

// The imported const `colorVar` is a CSS variable name, unique within the project.
// It's defined like this: `export const colorVar = '--color-3' satisfies Var`.
// The name `--color-3` was suggested by Typique.
import { colorVar } from './theme'

// The constant `titleClass` follows the configurable naming convention,
// which instructs Typique to provide completion items. `title-1` was suggested
// because `title` and `title-0` are used elsewhere in the project.
const titleClass = 'title-1' satisfies Css<{

fontSize: '1.3rem'
  fontWeight: '300'

  // `typeof` converts a constant to a string literal type
  // String interpolation concatenates string types
  color: `var(${typeof colorVar})`

  // Computed properties assign a value to a CSS variable
  [colorVar]: '#222'

  // Nesting works like you used to
  '&:hover': {
    [colorVar]: '#333'
  }
}>
```

</details> 

## Why Typique

- **No bundler hell — ever.** Requires no extra bundler or framework configuration.
- **Fast by design.** Reuses data TypeScript already computes for your editor.
- **Framework-agnostic.** Runs natively in TypeScript files; other file types can import styles from `.ts` files.
- **Colocation by default.** Define styles anywhere — even inside loops or functions — as long as you’re in TypeScript.
- **Feels like real CSS.** Supports natural nesting (compatible with the [CSS Nesting spec](https://www.w3.org/TR/css-nesting-1/)) and clean object syntax.
- **Zero effort SSR / RSC.** Works seamlessly because it emits plain CSS, not runtime code.
- **Transparent naming.** Class and variable names are readable, customizable, and visible right in your source — no magic.
- **Easy to migrate away.** Generated CSS is clean, formatted, and source-ready.

### Supported file types

A file type is supported given it's open on the TypeScript server and contains a TypeScript syntax.

- `.ts`, `.tsx`, `.mts` are supported natively
- `.vue` files are supported as long as your IDE uses the official [Vue TypeScript plugin](https://github.com/vuejs/language-tools/tree/master/packages/typescript-plugin), which is the case for VS Code.
  <details><summary>How does it work?</summary>The Vue TS Plugin incercepts file open requests, and transpiles `.vue` files to plain TS syntax. This allows TypeScript and any custom plugins, like Typique, to work with them as if they were `.ts` files</details>
- `.svelte` and `.js` files are not supported. You can define styles elsewhere and import names.

### Required TypeScript version

5.0 up to 6.x. TypeScript-Go (7) is not supported so far because it doesn't yet provide plugins API (it's a work in progress). Typique will support it as soon as the API is ready.

## Getting started

### 1. Install workspace TypeScript and Typique

Using workspace-scoped TS plugins, like Typique, require having a workspace TypeScript. Both `typescript` and `typique` packages needs to be installed in the same `node_modules`. To make this happen, run both `npm i` / `pnpm add` commands from the same directory - the project root typically:

```bash
npm i -D typescript
npm i typique
```

If you use VS Code, switch to the workspace TypeScript: **Command Palette → Select TypeScript Version → Use Workspace Version**.

### 2. Add the plugin to tsconfig.json

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin"
      }
    ]
  }
}
```

Note: the path `typique/ts-plugin` does not depend on the location of your `tsconfig.json` relative to the workspace root because it's given in terms of `node_modules` in which `typique` is installed. So it should be always the same.

### 3. Write some styles

Name your constants `...Class` and `...Var` to instruct Typique to suggest completion items in the constant initializers. (Full naming conventions are explained [further](#completion-in-different-contexts))

```ts
import type { Css, Var } from 'typique'

const sizeVar = '--size' satisfies Var
const roundButtonClass = 'round-button' satisfies Css<{
  [sizeVar]: 32
  borderRadius: `calc(${typeof sizeVar} / 2)`
  height: `var(${typeof sizeVar})`
  width: `var(${typeof sizeVar})`
}>
```

As you type in the opening quote in the constants initializer, you'll see the css-var and class names suggested by Typique:

(pics)

In WebStorm, you might need to invoke the explicit completion (Ctrl+Space) to see the suggestions.

The suggested class names are guaranteed to be unique within the project.

### 4. Import the generated CSS into your app

By default, Typique outputs a single CSS file named `typique-output.css` in your project root. Import it into your HTML template or entry point:

```html
<html>
<head>
  ...
  <link href="./typique-output.css" rel="stylesheet">
</head>
...
</html>
```

The file name is [configurable](./docs/Configuration.md#output).

### 5. Add a build step

Run the following command to build the CSS file from the command line:

```sh
npx typique --projectFile ./index.ts --tsserver ./path/to/tsserver.js -- ...ts-args
```

- `--projectFile` *(required)* — is any TypeScript file to bootstrap the TypeScript project, e.g. your root component or application entry point.
- `--tsserver` *(optional)* — is the path to the TypeScript server executable. Defaults to the result of `import.meta.resolve('typescript/lib/tsserver.js')`.
- `...ts-args` *(optional)* — any valid TS server command line arguments, e.g. logging or global plugins.

<details>

<summary>How can I specify a custom tsconfig.json?</summary>

Unlike `tsc`, the `tsserver.js` unfortunately doesn't allow specifying a custom `tsconfig.json` file: it locates the config file internally, when it opens the file specified by `--projectFile`. Usually it's the first `tsconfig.json` file up the directory hierarchy, which includes the specified `--projectFile`.

If you need a custom `tsconfig.json`, you may use the following workaround:

1. Replace the original `tsconfig.json` with your custom file;
2. Run `npx typique`;
3. Restore the original `tsconfig.json`.

</details>

## Completion in different contexts

The core (but not the only) idea of Typique as a tooling is to recognize where you are about to specify class or css-var name, and suggest you both readable and unique name via a completion item. The place which is recognized to require the class/css-var name is denoted as "completion context". The completion works slightly differently in different contexts.

### In variable initializer

All of the above examples demonstrate using this kind of context. The completion is suggested when the variable name matches the [configurable](/docs/Configuration.md#classvarname-and-varvarname) pattern, which is by default:

- `Class(es)?([Nn]ame(s)?)?$` for class names
- `Var(s)?([Nn]ame(s)?)?$` for variable names

### In TSX property value

This is useful for all TSX-native frameworks, including React, Preact, SolidJS, Qwik, etc. The completion is shown in the value of the property with the name matching the [configurable](/docs/Configuration.md#tsxpropname) pattern, which is by default `^class(Name)?$`:

(pic)

The result code may look like this:

```tsx
export function Button() {
  return <button className={ 'button' satisfies Css<{
    border: 'none'
    padding: `calc(${typeof unit}px * 2)`
  }> }>
    Click me
  </button>
}
```

### In other contexts

You can in principle add `satisfies Css<...>` or `satisfies Var` manually to any literal expression. This won't give any completion, but everything else (generating CSS, checking uniqueness) will work as for any other context.

```ts
export function Button() {
  return `<button class="${ 'button' satisfies Css<...> }" />`
}
```

## Context name

A **context name** is what Typique uses to generate class and css-var names. It is an internal identifier derived from the surrounding code.

```ts
const lgBtnClass = ''
//                 ^
// context name: lgBtn
```

```tsx
function AppTitle() {
  return <h1 className={''} />
  //                    ^
  // context name: AppTitle/h1
}
```

The context name is **not exactly** the variable name or the TSX path:

- For variables, it does not include the matched part of the naming convention
(for example, the `...Class` suffix).
- For TSX, it does not include the prop name (`className`).

The context name defines which class/css-var names are suggested in this place. It can be understood as a *space* of possible class/css-var names. Actual names do not have to include the full context name. For example:

- For `lgBtn`, possible names include: `lg-btn`, `lg`, `btn`, `l-b`, etc.
- For `AppTitle/h1`, possible names include: `app-title-h1`, `app-h1`, etc.
- For any context name, it's also allowed to have a numeric suffix (counter): `-0`, `-1`, `-2` etc. Typique uses it when the name is already taken elsewhere.

Finally, the [naming options](./docs/Configuration.md#namingoptions) let you control how the context name is transformed into a class or css-var name. For example, you can add constant parts, random parts, or even exclude the context name entirely.

## Class and css-var names validation

Typique checks that the name:

- Corresponds to the context name and current [naming options](./docs/Configuration.md#namingoptions)
- Is unique within the TypeScript project

In case of invalid name, a diagnostic is displayed, and quick-fixes are suggested:

(pic)

### The scope of uniqueness

Quick recap: the "TypeScript project" means the `tsconfig.json` file, plus source files which are included to it (referred to as "roots"), plus all files that are reachable via imports from the roots. One workspace can include multiple TypeScript projects, which is a typical case of monorepos.

The scope of names uniqueness is TypeScript project, not the workspace. To guarantee names uniqueness between the different TypeScript project, you can add names prefixes and suffixes via [naming options](./docs/Configuration.md#namingoptions). See also [demos description](./demos/) for additional comments on monorepo setup.

## Nesting CSS objects

The nested rules are interpreted as per the emerging [CSS Nesting Module](https://drafts.csswg.org/css-nesting-1/) specification. Currently Typique downlevels the nested CSS rules to plain objects; the support for native nesting is planned.

```ts
const fancy = 'fancy' satisfies Css<{
  color: 'teal'
  '@media (max-width: 600px)': {
    color: 'cyan'
    '&:active': {
      color: 'magenta'
    }
  }
}>
```

Output:

```css
.fancy {
  color: teal;
}
@media (max-width: 600px) {
  .fancy {
    color: cyan;
  }
  .fancy:active {
    color: magenta;
  }
}
```

## Array notation

Supports defining multiple css-vars or classnames in one expression.

For css-vars, make sure to have `as const` after the array initializer, otherwise TypeScript will infer the type as `string[]`:

```ts
const [xVar, yVar] = ['--x', '--y'] as const satisfies Var
```

For styles, it's possible to reference classnames from left-hand-side with `$0`,`$1`, `$2`, etc references:

```ts
const [rootClass, largeClass, boldClass, smallClass] =
  ['root', 'large', 'bold', 'small'] satisfies Css<{
    padding: '1rem' // root
    '&.$1': { // root.large
      padding: '1.3rem'
      '&.$2': { // root.large.bold
        fontWeight: '700'
      }
    }
    '&.$3': { // root.small
      padding: '0.5rem'
      '&.$2': { // root.small.bold
        fontWeight: '600'
      }
    }
  }>
```

Typique checks that all names are referenced, and that all `$`-references are valid.

### Keyframes, layers and other identifiers

`$`-references allow referencing any identifier, not just classnames. This is useful for keyframes, layers, etc.

```ts
const [buttonClass] = ['button', 'cn'] satisfies Css<{
  animation: '$1 0.3s ease-in-out'
  '@keyframes $1': {
    from: {
      opacity: 0
    }
    to: {
      opacity: 1
    }
  }
}>
```

The name `'cn'` is suggested by Typique when you open a quote after `'button',`. It's derived from the [configurable](./docs/Configuration.md#defaultcontextname) default context name, and, like any other name, is guaranteed to be unique. If you need it in runtime, you can of course request it in the left-hand-side, e.g. `const [buttonClass, fadeInKeyframes] = ...`.

## Object notation

For css-vars, object notation is useful to define themes:

```ts
const themeVars = {
  bgColor: '--theme-bg-color',
  space: '--theme-space'
} as const satisfies Var
```

As with array notation, make sure to have `as const` after the object initializer, otherwise TypeScript will infer types as `string`s.

For styles, this notation allows referencing the classnames by named `$`-references:

```ts
const buttonClasses = {
  // Classnames are suggested by Typique
  _: 'button',
  b: 'button-b',
  sz: {
    lg: 'button-sz-lg',
    sm: 'button-sz-sm',
  }
} satisfies Css<{
  padding: '1rem' // associated with the first classname, 'button'
  '&.$sz$lg': {   // button.button-sz-lg
    padding: '1.3rem'
    '&.$b': {     // button.button-sz-lg.button-b
      fontWeight: '700'
    }
  }
  '&.$sz$sm': {   // button.button-sz-sm
    padding: '0.5rem'
    '&.$b': {     // button.button-sz-sm.button-b
      fontWeight: '600'
    }
  }
}>
```

Object notation also allows selecting classnames based on props in a declarative way using the `co()` function explained [below](#utils).

## Global CSS

Styles not containing non-object properties on the top-level and `$`-references are output as is, resulting in global CSS:

```ts
[] satisfies Css<{
  body {
    margin: 0
  }
  '.hidden': {
    display: 'none'
  }
  '@font-face': {
    fontFamily: 'Open Sans'
    src: 'open-sans.woff'
  }
}>
```

Typique outputs this CSS as is. You can also mix local and global classnames:

```ts
const flexClass = 'flex-0' satisfies Css<{
  display: 'flex'
  '&.hidden': {
    display: 'none'
  }
}>
```

This outputs:

```css
.flex-0 {
  display: flex;
}
.flex-0.hidden {
  display: none;
}
```

## Fallbacks

Use tuple notation to assign multiple values to the same property.

```ts
const c = 'c' satisfies Css<{
  color: ['magenta', 'oklch(0.7 0.35 328)']
}>
```

## Utils

Typique provides two utils to combine classnames: `cc()` and `co()`. Both are exported from the package `typique/util`.

### `cc()` - concatenate classnames

Simply concatenates all values which are truthy. Useful to select classname based on some condition, for example, prop value.

```tsx
import type {Css} from 'typique'
import {cc} from 'typique/util'
<button className={ cc(
  'button' satisfies Css<{
    border: 'unset'
  }>,
  isLarge && 'button-0' satisfies Css<{
    fontSize: '1.4em'
  }>,
) }/>
```

### `co()` - select classnames from classnames object

Selects classnames from `classesObject` based on `props`. Works together with object notation.

```tsx
<button className={ co(
  {size},
  {
    _: 'button',
    size: {
      small: 'button-size-small',
      large: 'button-size-large',
    },
  } satisfies Css<{
    border: 'unset'
    '.$size$small': {
      fontSize: '.8em'
    }
    '.$size$large': {
      fontSize: '1.4em'
    }
  }>,
) }/>
```

Based on `size` variable value, passed in the first object, the classname will be either `button button-size-small` or `button button-size-large`. Please refer to `co()` tsdoc for more examples.

## TypeScript recipes

Here are some TypeScript recipes that come in handy with Typique.

### `typeof` operator

Converts a constant to a literal type.

```ts
const unit = 4
const spacedClass = 'spaced' satisfies Css<{
  padding: typeof unit // Type is 4, rendered as 4px
}>
```

### String interpolation

This works for both types and values.

```ts
const unit = 4
const padding = `${typeof unit}em` as const // Type is `4em`
type Padding = `${typeof unit}em`           // Type is `4em`
```

Note: the `+` operator produces the `string` and not a constant type. Make sure to always use the interpolation instead.

### Computed properties

This is useful for assigning a value to a CSS variable.

```ts
const paddingVar = '--padding' satisfies Var
const spacedClass = 'spaced' satisfies Css<{
  [paddingVar]: 4
}>
```

### Templating with generics

This is example of the dark theme which is by default synchronized with the system theme, but also can be overridden by user settings.

```ts
import type {Css, Var} from 'typique'

const [bgColorVar, nameVar] = ['--bgColor', '--name'] as const satisfies Var

type Light<Name extends string = '🖥️'> = {
  [bgColor]: '#fff'
  [name]: `"${Name}"`
}
type Dark<Name extends string = '🖥️'> = {
  [bgColor]: '#444'
  [name]: `"${Name}"`
}

const [lightClass, darkClass] = ['light', 'dark'] satisfies Css<{
  body: Light
  '@media (prefers-color-scheme: dark)': {
    body: Dark
  }
  'body.$0': Light<'☀️'>
  'body.$1': Dark<'🌙'>
}>
```

### Intersection operator

This can be used to join multiple type objects:

```ts
type NoPaddingNoMargin = {
  padding: 0
  margin: 0
}

const buttonClass = 'button' satisfies Css<NoPaddingNoMargin & {
  // ...
}>
```

### Mapped type

Can be used, for example, to define specs of multiple properties at once:

```ts
[] satisfies Css<{
  [_ in `@property ${typeof c0 | typeof c1}`]: {
    syntax: '"<color>"'
    initialValue: '#888'
    inherits: false
  }
}>
```

## Plans

Depending on the community feedback, the project may develop in the following directions:

- CSS syntax highlighting and completion
- Names in pure type space, without having them in runtime
- Richer name prefixes/suffixes setup
- Refactoring tools

## Further reading

- [Demos](./demos) — examples of using Typique in different frameworks, and configuring TypeScript in monorepos
- [Configuration](./docs/Configuration.md) — complete plugin parameters reference
