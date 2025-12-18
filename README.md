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

### Which file types are supported

Basically, a file type is supported given 1. It's open on the TypeScript server, and 2. it contains TypeScript syntax.

Examples:

- `.ts`, `.tsx`, `.mts` are supported natively
- `.vue` files are supported as long as your IDE uses the official [Vue TypeScript plugin](https://github.com/vuejs/language-tools/tree/master/packages/typescript-plugin), which is the case for VS Code. See Vue demo.
  <details><summary>How does it work?</summary>The Vue TS Plugin incercepts file open requests, and transpiles `.vue` files to plain TS syntax. This allows TypeScript and any custom plugins, like Typique, to work with them as if they were `.ts` files</details>
- `.svelte` files are not supported because, unlike Vue, they are not open on TypeScript server. You can import classes from a `.ts` file. See Svelte demo.
- `.js` are not supported. You can define styles in a `.ts` file and import them to a `.js` file. See JS Demo.

### Required TypeScript version

5.0 or higher

## Documentation

- This README — continue reading for quick setup and basic examples
- [Demos](./demos) — using Typique in different frameworks
- [Composing Class Names](./docs/ComposingClassNames.md) — how to configure the variables naming conventions, class names patterns, and how to make them unique across multiple independent projects
- [Plugin Description](./docs/PluginDescription.md) — how the Typique plugin interacts with the editor, how it affects the performance
- [Configuration](./docs/Configuration.md) — complete plugin parameters reference
- [CLI](./docs/CLI.md) — command-line interface reference

## Getting started

### 1. Install Typique

```bash
npm i typique
```

### 2. Install workspace TypeScript

Unless you already have workspace TypeScript, install it **in the same directory** where you installed `typique`. TypeScript requires its plugins to reside in the same `node_modules` as the workspace `typescript` installation.

```bash
npm --save-dev i typescript
```

If you use VS Code, switch to the workspace TypeScript: **Command Palette → Select TypeScript Version → Use Workspace Version**.

### 3. Add the plugin

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

### 4. Write some styles

Name your constants `...Class` and `...Var` to instruct Typique to suggest completion items in the constant initializers. Constants names are [configurable](./docs/ComposingClassNames.md).

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

### 5. Import the generated CSS into your app

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

### 6. Add a build step

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

## Where can I define classes?

Basically, you can attach it to any string, array or object literal expression by appending `... satisfies Css<{...}>` to it. However, IDE completion would work slightly differently in different places, for which we define three locations: var initializer, TSX prop value, and other place.

### Var initializer

Just add the `... satisfies Css<{...}>` to the right of the variable initializer. Left hand side (an str literal between `=` and `satisfies`) would be recognized as a class name; type arg of `Css` would be interpreted as a style.

```ts
const btClass = 'bt' satisfies Css<{
  //             ^^ classname
  // This object is interpreted as a style
  border: 'none'
  padding: 4
}>
```

To simplify things for you, name your var with `...Class(es)` or `...ClassName(s)` suffix, and Typique will provide you a completion item with the unique class name derived from the var name.

<details>

<summary>What are exactly naming conventions? Do I always need to keep to them?</summary>

The naming conventions are defined as regex pattern in the plugin config under the key `"classNameVarRegexp"`, which is explained in [ComposingClassAndVarNames.md](./docs/ComposingClassAndVarNames.md).

You don't need to keep to this convention — it's only a tool to provide you the completion items. Without it, you'd just need to manually type in the whole `satisfies`-expression. Typique will validate the class name and generate CSS regardless of JS variable name.

</details>

### TSX prop value

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

However, to provide classnames as completion items, Typique tries to recognize the following patterns:

- Variable initializer, with variable name(s) [matching `varNameRegex`](./docs/ComposingClassNames.md), for example `const buttonClass = ...`
- TSX property, with property name(s) [matching `propNameRegex`](./docs/ComposingClassNames.md), for example `<button className={...} />`
- Inside [composeFunction parameters](./docs/ComposingClassNames.md) if a composeFunction is configured, for example `cc('...')`
- For CSS vars: variable initializer, with variable name(s) [matching `cssVarVarNameRegex`](./docs/ComposingClassNames.md), for example `const bgColorVar = ...`

If you define CSS in some exotic place which Typique doesn't recognize, you can proceed without the completion item. Once you complete `... satisfies Css<{...}>`, Typique will validate the name and suggest the correct one in case of issues.

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

## Multiple classnames in one expression

This is useful to specify styles which depend on each other, e.g. one is nested to other. Typique supports two notations for this: array and object.

### Array notation

```ts
const [rootClass, largeClass, boldClass, smallClass] =
  ['root', 'large', 'bold', 'small'] satisfies Css<{
    padding: '1rem'
    '&.$1': {
      padding: '1.3rem'
      '&.$2': {
        fontWeight: '700'
      }
    }
    '&.$3': {
      padding: '0.5rem'
      '&.$2': {
        fontWeight: '600'
      }
    }
  }>
```

Typique checks that all classnames are referenced, and that all references are valid.

It's possible to also reference the root classname with `$0` which can be useful in the nested levels to back-reference the root:

```ts
const largeClass = 'large' satisfies Css<{
  p: {
    padding: '0.4em'
    '&.$0': {
      padding: '0.8em'
    }
  }
}>
```

This defines global `0.4em` padding for `p` elements, but for `<p class="large">` it will be `0.8em`.

### Object notation

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

## Referencing identifier in object key

You can use `$`-references to reference any identifier (not just class names). This is useful for things like keyframes and layers, which need the name on the property key position:

```ts
const [buttonClass,] = ['button', 'cn'] satisfies Css<{
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

The explicitly ignored name (comma after `buttonClass`) instructs Typique to suggest the 2-places completion item inside `['']`. You can also bind it to a variable if you need it in the runtime — in this case the left-hand side would be `const [buttonClass, fadeInKeyframes]`.

## Fallbacks

Use tuple notation to assign multiple values to the same property.

```ts
const c = 'c' satisfies Css<{
  color: ['magenta', 'oklch(0.7 0.35 328)']
}>
```

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
