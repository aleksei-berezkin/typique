# Typique

Typique (pronounced /ti'pik/) is a framework- and bundler-agnostic, zero-runtime CSS-in-TS library powered by a TypeScript plugin. It generates readable, unique class and variable names directly as completion items in your editor. Styles exist only as types, so they vanish cleanly from your final build.

## Example

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

A file type is supported given it's open on the TypeScript server and contains a TypeScript syntax. If the file type is not supported, you can still import styles from another file. Examples:

- `.ts`, `.tsx`, `.mts` are supported natively
- `.vue` files are supported as long as your IDE uses the official [Vue TypeScript plugin](https://github.com/vuejs/language-tools/tree/master/packages/typescript-plugin), which is the case for VS Code. See Vue demo.
  <details><summary>How does it work?</summary>The Vue TS Plugin incercepts file open requests, and transpiles `.vue` files to plain TS syntax. This allows TypeScript and any custom plugins, like Typique, to work with them as if they were `.ts` files</details>
- `.svelte` files are not supported because, unlike Vue, they are not open on TypeScript server. You can import classes from a `.ts` file. See Svelte demo.
- `.js` are not supported. You can define styles in a `.ts` file and import them to a `.js` file. See JS Demo.

### Required TypeScript version

5.0 up to 6.x. TypeScript-Go (7) is not supported so far because it doesn't yet provide plugins API (it's a work in progress). Typique will support it as soon as the API is ready.

## Getting started

### 1. Install workspace TypeScript and Typique

Both need to be installed it in the same `node_modules`.

```bash
npm i -D typescript
npm i typique
```

If you use VS Code, switch to the workspace TypeScript: **Command Palette → Select TypeScript Version → Use Workspace Version**.

### 2. Add the plugin

Add the Typique plugin to your `tsconfig.json`:

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

### 3. Write some styles

Name your constants `...Class` and `...Var` to instruct Typique to suggest completion items in the constant initializers. (Full naming conventions are explained further)

```ts
import type { Css, Var } from 'typique'

const sizeVar = '--size' satisfies Var
const roundButtonClass = 'round-button' satisfies Css<{
  [sizeVar]: 32
  borderRadius: `calc(${sizeVar} / 2)`
  height: `var(${sizeVar})`
  width: `var(${sizeVar})`
}>
```

As you type in the opening quote in the constants initializer, you'll see the class names suggested by Typique. In WebStorm, you might need to invoke the explicit completion (Ctrl+Space) to see the suggestions.

The suggested class names are guaranteed to be unique within a project.

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

You can change the output file name via the plugin [configuration](./docs/Configuration.md).

### 5. Add a build step

Run the following command to build the CSS file from the command line:

```bash
npx typique --projectFile ./index.ts --tsserver ./path/to/tsserver.js -- ...ts-args
```

<details>

<summary>What do the args mean?</summary>

- `--projectFile ./index.ts` *(required)* — any TypeScript (`.ts` or `.tsx`) file in your project. It’s used to bootstrap the TypeScript project and initialize the Typique plugin. Common choices are your root component or application entry point. Relative paths are resolved against the current working directory. *Note:* don't specify here `tsconfig.json`, it will likely not work. See below on specifying `tsconfig.json`.
- `--tsserver ./path/to/tsserver.js` *(optional)* — path to the TypeScript server executable. If not set, the script invokes `import.meta.resolve('typescript/lib/tsserver.js')` to discover the file.
- `...ts-args` *(optional)* — any valid TS server command line arguments, e.g. logging or global plugins.

#### Example

This is how it can look like for Next.JS project with verbose logging enabled:

```bash
npx typique --projectFile ./app/layout.tsx -- --logVerbosity verbose --logFile ./tsserver.log
```

#### Is it possible to specify `tsconfig.json` as a cmd arg?

Unlike `tsc`, the `tsserver.js` unfortunately doesn't allow specifying a custom `tsconfig.json` file: it locates the config file internally, when it opens the file specified by `--projectFile`. Usually it's the first `tsconfig.json` file up the directory hierarchy, which includes the specified `--projectFile`.

If you need a custom `tsconfig.json`, you may use the following workaround:

1. Replace the original `tsconfig.json` with your custom file;
2. Run `npx typique`;
3. Restore the original `tsconfig.json`.

</details>

## Completion

Typique recognizes most important contexts and suggests completion items so that you don't need to type in the class/var name and the following `satisfies`-expression.

TODO context name? where to explain?

### In var initializer

The completion is suggested in the variable initializer when the variable name matches the configured pattern, which is by default:

- `Class(es)?([Nn]ame(s)?)?$` for class names
- `Var(s)?([Nn]ame(s)?)?$` for variable names

The conventions can be changed via the plugin [configuration](/docs/Configuration.md).

### In TSX prop value

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

TODO

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

- For `lg-btn`, possible names include: `lg-btn`, `lg`, `btn`, `l-b`, etc.
- For `AppTitle/h1`, possible names include: `app-title-h1`, `app-h1`, etc.

If a generated name is already used elsewhere, Typique appends a numeric suffix:
`-0`, `-1`, `-2`, and so on.

Finally, the [Configuration](./docs/Configuration.md) lets you control how the context name is transformed into a class or css-var name. For example, you can add constant parts, random parts, or even exclude the context name entirely.

## Validation

### Uniqueness

TODO

## Nesting

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

Supports defining multiple related classnames or vars in one expression. For classes, it's possible to reference classnames from left-hand-side with `$0`,`$1`, `$2`, etc references.

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

Typique checks that all names are referenced, and that all references are valid.

### Keyframes, layers and other identifiers on key position

Array notation can be useful to define keyframes and layers because `$`-references allow referencing any identifier (not just class names).

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

The name `'cn'` is suggested by Typique when you open a quote after `'button',`. It's derived from the [`defaultContextName` config](/.docs/NamingOptions.md), and is guaranteed to be unique. (E.g. the next keyframes would be `cn-0`, `cn-1` etc). If you need it in runtime, you can of course request it in the left-hand-side, e.g. `const [buttonClass, fadeInKeyframes]`.

## Object notation

TODO vars

This notation is especially useful to define styles based on component props, and works best with the `co()` helper (see below). See an example in the [Qwik demo project](demos/qwik-toast/src/routes/index.tsx).

```ts
const buttonClasses = {
  _: 'button',
  b: 'button-b',
  sz: {
    lg: 'button-sz-lg',
    sm: 'button-sz-sm',
  }
} satisfies Css<{
  padding: '1rem'
  '&.$sz$lg': {
    padding: '1.3rem'
    '&.$b': {
      fontWeight: '700'
    }
  }
  '&.$sz$sm': {
    padding: '0.5rem'
    '&.$b': {
      fontWeight: '600'
    }
  }
}>
```

Root non-object properties (`padding: '1rem'` here) are associated with the first defined classname property (`_: 'button'`). It can be also directly referenced with `.$_`. Like with array notation, all references and classnames are checked.

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

## CSS variables and theming

Typique assumes theming with CSS-variables. Similar to classes, you can declare single variables, arrays and objects of them. To make sure the type is inferred as a constant, not just `string`, add `as const` after the array or object initializer. Finally, `satisfies Var` signals Typique to check if it's unique among other variables also marked this way. You may think of `satisfies Var` as a mark of a "managed variable".

```ts
import type {Css, Var} from 'typique'

const wVar = '--w' satisfies Var
const [bgColorVar, spaceVar] = ['--bg-color', '--space'] as const satisfies Var
const themeVars = {
  bgColor: '--theme-bg-color',
  space: '--theme-space'
} as const satisfies Var

[] satisfies Css<{
  body: {
    [wVar]: '100%'
    [themeVars.bgColor]: '#ffffff'
    [themeVars.space]: '4px'
  }
  '@media (prefers-color-scheme: dark)': {
    body: {
      [themeVars.bgColor]: '#303030'
    }
  }
}>
```

Just like classnames, completion items are shown for names which follow the configured pattern `varNameRegex/cssVars`, which is by default `Vars?([Nn]ames?)$`. There are also configs to define the generated variable name. See [ComposingClassNames](./docs/ComposingClassNames.md).

## Fallbacks

Use tuple notation to assign multiple values to the same property.

```ts
const c = 'c' satisfies Css<{
  color: ['magenta', 'oklch(0.7 0.35 328)']
}>
```
## Sharing constants between CSS and runtime

Because CSS is defined as types, the task comes down to converting constants to types. The following TS language features can perform this for you:

### `typeof` operator

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
const padding = `${typeof unit}em` // Type is `4em`
type Padding = `${typeof unit}em` // Same, type is `4em`
```

Note: the `+` operator produces the `string` and not a constant type. Make sure to always use interpolation instead.

### Computed properties

This is useful for CSS vars explained below.

```ts
const paddingVar = '--padding' satisfies Var
const spacedClass = 'spaced' satisfies Css<{
  [paddingVar]: 4
}>
```

### Arithmetic operations

TypeScript doesn't directly support arithmetic operations on types, so it's easier to use CSS `calc()` function:

```ts
const unit = 4
const spacedClass = 'spaced' satisfies Css<{
  padding: `calc(${typeof unit}px * 2)`
}>
```

It's planned to introduce the precalculation of `calc()` with only constants.

## Reusing and templating CSS rule objects

Like any other TypeScript types, CSS objects can be defined as named aliases and reused multiple times; they can also be generic. Here are some examples how to use this in common patterns.

### Dark theme

```ts
import type {Css, Var} from 'typique'

declare const [bgColorVar, nameVar]: Var<['--bgColor', '--name']>

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

### TODO: reusing fragments with {} & {}


## Classnames refactoring (planned)

Because classnames remain constants in the source code, they may get inconsistent as the project grows. Tools for project-wide classnames refactoring are planned.

## Further reading

- [Demos](./demos) — using Typique in different frameworks
- [Configuration](./docs/Configuration.md) — complete plugin parameters reference
