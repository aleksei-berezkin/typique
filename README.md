# Typique

Typique (pronounced /ti'pik/) is a framework- and bundler-agnostic, zero-runtime CSS-in-TS library powered by a TypeScript plugin. It generates readable, unique class and variable names directly as completion items in your editor. Styles exist only as types, so they vanish cleanly from your final build.

## Example

(video)

```ts
import type { Css } from 'typique'
import { space } from './my-const'

const titleClass = 'title-1' satisfies Css<{
  fontSize: '1.3rem'
  padding: `calc(2 * ${typeof space}px)`
  '&:hover': {
    fontWeight: 'bold'
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

Typique is built to feel boring — in a good way. No new runtime model, no clever indirections, just CSS generated directly from TypeScript with minimal friction.

- **No bundler hell — ever.** Requires no extra bundler or framework configuration.
- **Fast by design.** Reuses data TypeScript already computes for your editor.
- **Framework-agnostic.** Works directly in TypeScript files; other file types can import styles from `.ts`.
- **Colocation by default.** Define styles anywhere TypeScript allows — top level, inside functions, even inside loops.
- **Feels like real CSS.** Supports natural nesting (compatible with the [CSS Nesting spec](https://www.w3.org/TR/css-nesting-1/)) with a clean, object-based syntax.
- **Zero effort SSR / RSC.** Works seamlessly because it emits plain CSS, not runtime code.
- **Transparent naming.** Class and variable names stay readable, configurable, and visible in your source — no hidden magic.
- **Easy to migrate away.** The generated CSS is clean, formatted, and source-ready.

## Version requirements

- **TypeScript:** **5.5** up to **6.0**  
  TypeScript-Go (7) is not supported yet because it [does not currently expose a plugins API](https://github.com/microsoft/typescript-go?tab=readme-ov-file#what-works-so-far). Typique will support it once the API becomes available.
- **Node.js:** **18** and above

## Supported file types

A file type is supported if it is opened by the TypeScript server and contains TypeScript syntax.

- **Native support:** `.ts`, `.tsx`, `.mts`
- **Vue:** `.vue` files are supported when your IDE uses the official [Vue TypeScript plugin](https://github.com/vuejs/language-tools/tree/master/packages/typescript-plugin) (this is the default in VS Code).
  <details>
    <summary>How does it work?</summary>
    The Vue TypeScript plugin intercepts file-open requests and transpiles `.vue` files into plain TypeScript syntax. This allows TypeScript — and custom plugins like Typique — to operate on them as if they were regular `.ts` files.
  </details>
- **Not supported:** `.svelte` and `.js` files. Styles can still be defined in TypeScript and imported from there.

## Getting started

### 1. Install workspace TypeScript and Typique

Using workspace-scoped TypeScript plugins like Typique requires a workspace TypeScript installation. Both the `typescript` and `typique` packages must be installed in the same `node_modules`. To ensure this, run the `npm i` / `pnpm add` commands from the same directory — typically the project root:

```bash
npm i -D typescript
npm i typique
```

Or:

```bash
pnpm add -D typescript
pnpm add typique
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

Note: the path `typique/ts-plugin` does not depend on the location of your `tsconfig.json` relative to the workspace root. It is resolved from the `node_modules` directory where `typescript` is installed, so as long as `typique` is installed in the same `node_modules`, the path is always the same.

### 3. Write some styles

Name your constants `...Class` and `...Var` to instruct Typique to suggest completion items in the constant initializers. Full naming conventions are explained [further](#completion-in-different-contexts).

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

As you type the opening quote in the constant initializer, Typique suggests class and css-var names:

(pics)

In WebStorm, you may need to invoke explicit completion (Ctrl+Space) to see the suggestions.

The suggested class names are guaranteed to be unique within the TypeScript project. The scope of this uniqueness is explained in more detail [below](#the-scope-of-name-uniqueness).

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

Run the following command to generate the CSS file from the command line:

```sh
npx typique --projectFile ./index.ts --tsserver ./path/to/tsserver.js -- ...ts-args
```

- `--projectFile` *(required)* — any TypeScript file used to bootstrap the TypeScript project, for example your root component or application entry point.
- `--tsserver` *(optional)* — the path to the TypeScript server executable. Defaults to the result of `import.meta.resolve('typescript/lib/tsserver.js')`.
- `...ts-args` *(optional)* — any valid TypeScript server command-line arguments, such as logging or global plugins.

<details>

<summary>How can I specify a custom tsconfig.json?</summary>

Unlike `tsc`, `tsserver.js` does not allow explicitly specifying a custom `tsconfig.json` file. Instead, it locates the configuration internally when opening the file provided via `--projectFile`. This is usually the first `tsconfig.json` found when walking up the directory hierarchy from that file.

If you need to use a custom `tsconfig.json`, you can apply the following workaround:

1. Temporarily replace the original `tsconfig.json` with your custom one.
2. Run `npx typique`.
3. Restore the original `tsconfig.json`.

</details>

## Completion in different contexts

One of the core ideas of Typique as a tooling is to recognize when you are about to specify a class or CSS variable name and suggest a readable, unique name via code completion. A location where Typique expects a class or CSS variable name is called a *completion context*. Completion behaves slightly differently depending on the context.

### In variable initializer

All of the examples above use this kind of context. Completion is suggested when the variable name matches a [configurable](/docs/Configuration.md#classvarname-and-varvarname) pattern, which by default is:

- `Class(es)?([Nn]ame(s)?)?$` for class names
- `Var(s)?([Nn]ame(s)?)?$` for variable names

### In TSX property value

This is useful for TSX-native frameworks such as React, Preact, SolidJS, Qwik, and others. Completion is shown in the value of a property whose name matches the [configurable](/docs/Configuration.md#tsxpropname) pattern, which by default is `^class(Name)?$`:

(pic)

The resulting code may look like this:

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

In principle, you can manually add `satisfies Css<...>` or `satisfies Var` to any literal expression. This does not provide completion, but everything else — CSS generation and uniqueness checks — works the same way as in other contexts.

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

## Class and CSS variable name validation

Typique validates that a name:

- Matches the derived context name and the current [naming options](./docs/Configuration.md#namingoptions)
- Is unique within the TypeScript project

If a name is invalid, a diagnostic is shown and quick fixes are suggested:

(pic)

## The scope of name uniqueness

As a reminder, a TypeScript project consists of:

- A `tsconfig.json` file
- The source files included by that config (often called *roots*)
- All files reachable via imports from roots

A single workspace can contain multiple TypeScript projects, which is common in monorepos.

Typique enforces name uniqueness at the TypeScript project level, not at the workspace level. To guarantee uniqueness across multiple TypeScript projects, you can add prefixes or suffixes via the [naming options](./docs/Configuration.md#namingoptions). For more advanced setups, see the [Monorepos and Shared Code](./docs/MonoreposAndSharedCode.md) guide.

---

*The next several sections describe the syntax Typique supports for defining styles. They are mostly independent and can be read in any order.*

## Nesting CSS objects

Nested rules are interpreted according to the emerging [CSS Nesting Module](https://drafts.csswg.org/css-nesting-1/) specification. Currently, Typique downlevels nested rules into plain CSS; support for native CSS nesting is planned.

```ts
const fancyClass = 'fancy' satisfies Css<{
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

Allows defining multiple related CSS variables or class names in a single expression.

For CSS variables, make sure to add `as const` after the array initializer; otherwise, TypeScript will infer the type as `string[]`:

```ts
const [xVar, yVar] = ['--x', '--y'] as const satisfies Var
```

For styles, it’s possible to reference class names from the left-hand side using `$0`, `$1`, `$2`, and so on:

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

Typique validates that all names are referenced and that all `$` references are valid.

### Keyframes, layers, and other identifiers

`$` references can be used to reference any identifier, not just class names. This is useful for keyframes, layers, and similar constructs.

```ts
const [buttonClass] = ['button', 'cn-1'] satisfies Css<{
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

The name `'cn-1'` is suggested by Typique when you open a quote after `'button',`. It’s derived from the [configurable](./docs/Configuration.md#defaultcontextname) default context name and, like any other name, is guaranteed to be unique. If you need the generated name at runtime, you can request it on the left-hand side, for example: `const [buttonClass, fadeInKeyframes] = ...`.

## Object notation

For CSS variables, object notation is useful for defining themes:

```ts
const themeVars = {
  bgColor: '--theme-bg-color',
  space: '--theme-space'
} as const satisfies Var
```

As with array notation, make sure to add `as const` after the object initializer; otherwise, TypeScript will infer the values as `string`.

For styles, this notation allows referencing class names via named `$` references:

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

Object notation also enables selecting class names based on props in a declarative way using the `co()` function, explained [below](#utils).

## Global CSS

Styles that don’t contain non-object properties at the top level and don’t use `$` references are emitted as-is, resulting in global CSS:

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

Typique outputs this CSS unchanged. You can also mix local and global class names:

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
const cClass = 'c' satisfies Css<{
  color: ['magenta', 'oklch(0.7 0.35 328)']
}>
```

## Utils

Typique provides two utilities for combining class names: `cc()` and `co()`. Both are exported from the `typique/util` package.

### `cc()` — concatenate class names

Simply concatenates all values that are truthy. This is useful for selecting class names based on conditions, for example, prop values.

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

### `co()` — select class names from a class name object

Selects class names from a `classesObject` based on `props`. This utility is designed to work together with object notation.

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

Based on the value of the `size` variable passed in the first object, the resulting class name will be either `button button-size-small` or `button button-size-large`. See the `co()` TSDoc for more examples.

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

## Further reading

- [Demos](./demos) — examples of using Typique in different frameworks, and configuring TypeScript in monorepos
- [Configuration](./docs/Configuration.md) — complete plugin parameters reference
- [Monorepos and Shared Code](./docs/MonoreposAndSharedCode.md) — how to use Typique in monorepos and reusable libraries
- [Plugin Description](./docs/PluginDescription.md) — architecture and performance of the plugin and the package

## Plans

Depending on the community feedback, the project may develop in the following directions:

- CSS syntax highlighting and better completion
- Names in pure type space, without having them in runtime
- Richer name prefixes/suffixes setup
- Refactoring tools

## Acknowledgements

Typique took its inspiration from the following great libs:

- [Vanilla Extract](https://vanilla-extract.dev/)
- [Linaria CSS](https://linaria.dev/)
- [Pigment CSS](https://github.com/mui/pigment-css)
