# Typique

Typique is a bundler-agnostic zero-runtime CSS-in-TS library working as a TypeScript plugin. Styles are defined as types, which is why they are clearly removed from your build regardless of the bundler.

## Example

```ts
import type { Css } from 'typique'
import { space } from './my-const'

const titleClass = 'title' satisfies Css<{
  fontSize: '1.3rem'
  fontWeight: '300'
  textTransform: 'uppercase'
  padding: `calc(2 * ${typeof space}px) 0`
  '&:hover': {
    fontWeight: '500'
  }
}>
```

**Anatomy:**

- `'title'` is a class name which stays unchanged. Typique provides autocomplete suggestions, checks for duplicates, and offers quick fixes if collisions occur. It's also possible to use prefixes and user-defined helper functions, e.g. `cn('title')`. Everything is [configurable](./docs/ComposingClassNames.md).
- `satisfies Css<{...}>` is where you define your styles as a type.
- `&` is a parent selector shortcut. By default, it is preprocessed like in other CSS templating engines, but it can also be left as-is to rely on [native nesting support](https://drafts.csswg.org/css-nesting-1/).

## What is supported

As a [TypeScript](https://www.typescriptlang.org/) compiler plugin, Typique can be directly used in `.ts` and `.tsx` files. You can also use Typique in other environments (e.g. Vue, Svelte, plain JavaScript) by importing a `.ts` file that contains your styles. See the [framework integration guide](./docs/Frameworks.md) for details.

## Setup

The steps below are for a standalone small to medium-large project with one `tsconfig.json`. If your project is anything different, check the [Composing Class Names](./docs/ComposingClassNames.md) guide.

### 1. Install Typique

```bash
npm i typique
```

### 2. Add the TypeScript plugin

In your `tsconfig.json`:

```json
"compilerOptions": {
  "plugins": [
    {
      "name": "typique/ts-plugin"
    }
  ]
}
```

If you're using VS Code, make sure to select the Workspace TypeScript version: **Command Palette → Select TypeScript Version → Use Workspace Version**.

### 3. Write some styles

Name your constants `...Class` and `...Var` to instruct Typique to suggest completion items in the constant initializers. Names and formats are [configurable](./docs/ComposingClassNames.md).

```ts
import type { Css, Var } from 'typique'

const sizeVar = '--r-btn-sz' satisfies Var
const roundButtonClass = 'r-btn' satisfies Css<{
  [sizeVar]: 32
  borderRadius: `calc(${sizeVar} / 2)`
  height: `var(${sizeVar})`
  width: `var(${sizeVar})`
}>
```

In WebStorm, you might need to invoke the explicit completion (Ctrl+Space) to see the suggestions.

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

Run the following command to compile the CSS file:

```bash
npx typique --build ./projectFile.ts -- ...ts-params
```

- `projectFile.ts` (required) — any TypeScript file in your project. It’s used to bootstrap TypeScript and initialize the Typique plugin. Common choices are your root component or application entry point.
- `...ts-params` (optional) — any valid TypeScript [compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html).

## More examples

You can also check examples in the [tests directory](./test/basic).

### Sharing constants between CSS and runtime

```ts
const unit = 4

const spacedClass = 'spaced' satisfies Css<{
  padding: `calc(${typeof unit}px * 2)`
}>

export function Button() {
  return <button className={spaced}>
    With unit=${unit}
  </button>
}
```

It’s important that the variable’s value is **compile-time constant**. For example:

```ts
let   unit    = 4        // ❌ Type is 'number', not 4
const padding = 4 * 2    // ❌ Type is 'number', not 8
const margin  = 4 + 'em' // ❌ Type is 'string', not '4em'
```

Instead write:

```ts
const unit = 4                    // ✅ Type is 4
const paddedClass = 'pd' satisfies Css<{
  padding:
    `calc(${typeof unit}px * 2)`  // ✅ Type is `calc(4px * 2)`
}>
const margin = `${unit}em`        // ✅ Type is '4em'
type  Margin = `${typeof unit}em` // ✅ Type is '4em'
```

### React and TSX

In TSX components, CSS can be defined inline, in a `className` property:

```tsx
export function Button() {
  return <button className={ 'bt-1' satisfies Css<{
    border: 'none'
    padding: `calc(${typeof unit}px * 2)`
  }> }>
    Click me
  </button>
}
```

### Nesting

The nested rules are interpreted as per the emerging [CSS Nesting Module](https://drafts.csswg.org/css-nesting-1/) specification. By default Typique downlevels the nested CSS rules to plain objects. This can be changed via the [`nativeNesting: true`](./docs/Configuration.md) option.

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

Without the `nativeNesting`, the above example will output:

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

With the option, it will output almost same as written:

```css
.fancy {
  color: teal;
  @media (max-width: 600px) {
    color: cyan;
    &:active {
      color: magenta;
    }
  }
}
```

### Multiple classnames

```ts
const [rootClass, largeClass, boldClass, smallClass] =
  ['my-r', 'my-lg', 'my-b', 'my-sm'] satisfies Css<{
    padding: '1rem'
    '&.lg': {
      padding: '1.3rem'
      '&.b': {
        fontWeight: '700'
      }
    }
    '&.sm': {
      padding: '0.5rem'
      '&.b': {
        fontWeight: '600'
      }
    }
  }>
```

Typique rewrites class names in the order they appear. Identical input names map to identical output names. In the example above `.b` appears twice, and its both occurrences will be rewritten to `.my-b`. Typique checks that the number of requested names (on the left-hand side of `=`) matches the number of classnames in the constant initializer, and the actual number of classes defined in `Css<{...}>`.

### Global CSS

Non-classes are output as is. To output a classname as written, prefix it with `$$`:

```ts
[] satisfies Css<{
  body {
    margin: 0
  }
  '.$$hidden': {
    display: 'none'
  }
  '@font-face': {
    fontFamily: 'Open Sans'
    src: 'open-sans.woff'
  }
}>
```

Typique will only remove `$$` from the classname, and output the CSS as is. Note that the left-hand side of `satisfies` can be also a string, for example ''.

You can also mix local and global classnames:

```ts
const flexClass = 'flx' satisfies Css<{
  display: 'flex'
  '&.$$hidden': {
    display: 'none'
  }
}>
```

This outputs:

```css
.flx {
  display: flex;
}
.flx.hidden {
  display: none;
}
```

Or, if native nesting enables:

```css
.flx {
  display: flex;
  &.hidden {
    display: none;
  }
}
```

### CSS variables

To ensure variable name uniqueness, use the `Var` type.

```ts
import type {Css, Var} from 'typique'

const w = '--width' satisfies Var
// Or, if you don't need it in the runtime:
declare const w: Var<'--width'>

// You can use tuples
const [bgColorVar, spaceVar] = ['--bgColor', '--space'] satisfies Var

// Or even arrange them as objects with your own helper.
// `themeObject` returns e.g.: {bgColor: '--th-bgColor', space: '--th-space'}
const theme = themeObject(['bgColor', 'space']) satisfies Var

[] satisfies Css<{
  body: {
    [w]: '100%'
    [theme.bgColor]: '#ffffff'
    [theme.space]: '4px'
  }
  '@media (prefers-color-scheme: dark)': {
    body: {
      [theme.bgColor]: '#303030'
    }
  }
}>
```

If you need a variable object type to be globally accessible, place it in an ambient file:

**globalTheme.d.ts:**

```ts
import {ThemeObject} from './my-theme'
import type {Var} from 'typique'
declare global {
  const globalTheme: Var<ThemeObject<['color', 'bgColor']>>
}
export {}
```

**page.tsx:**

```ts
/// <reference path="./globalTheme.d.ts" />

import type {Css} from 'typique'

const [cn] = 'theme' satisfies Css<{
  [globalTheme.color]: '#333'
  [globalTheme.bgColor]: '#fff'
}>
```

The triple-slash reference above must appear in *any* TS file that is compiled.

### Reusing and templating rule sets

Like any other object types, CSS objects can be defined as named aliases and reused multiple times. They can also be generic.

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

const [light, dark] = 'page' satisfies Css<{
  body: Light
  '@media (prefers-color-scheme: dark)': {
    body: Dark
  }
  'body.light': Light<'☀️'>
  'body.dark': Dark<'🌙'>
}>
```

### Rewriting any name

You can instruct Typique to rewrite any identifier (not just class names) with a `%%` prefix. This is useful for things like keyframes and layers, which are otherwise global:

```ts
const [btn,] = ['btn',] satisfies Css<{
  animation: `%%fadeIn 0.3s ease-in-out`
  '@keyframes %%fadeIn': {
    from: {
      opacity: 0
    }
    to: {
      opacity: 1
    }
  }
}>
```

The `%%`-prefixed names are also available on the left-hand-side, e.g. you may write `const [btn, fadeIn] = ...` but if you don't need them, ignore explicitly, as in the example above.

### Fallbacks

Use tuple notation to assign multiple values to the same property.

```ts
const c = 'c' satisfies Css<{
  color: ['magenta', 'oklch(0.7 0.35 328)']
}>
```

### Classnames refactoring

Because classnames remain constants in the source code, they may get inconsistent as the project grows. Typique provides tools for automated detection and fixing of inconsistent classnames.

## Performance

On TS Server startup, Typique scans all TypeScript project files that match the plugin’s `include` and `exclude` [filters](./docs/Configuration.md), so startup may take longer in large codebases. During editing, Typique only re-evaluates changed files, which is typically fast. If you suspect performance issues, open the TS Server log and check records prefixed with `TypiquePlugin::`. Most entries include the elapsed time.

If you encounter performance problems, consider:

- Limiting scanned files with the plugin’s `include` and `exclude` settings
- Splitting large files with multiple styles invocations into smaller ones
- Splitting large projects into smaller ones (note: see the [Composing Class Names](./docs/ComposingClassNames.md) guide on avoiding collisions between projects)

## The library name

Typique — French for “typical”, pronounced /ti'pik/
