# Typique

Typique is a bundler-agnostic zero-runtime CSS-in-TS library working as a TypeScript plugin. Styles are defined as types, which is why they are cleanly removed from your build regardless of the bundler.

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

- `'title'` is a class name which stays directly in the source code. Typique provides the extensive tooling to automate classnames selection and validation.
- `satisfies Css<{...}>` is where you define your styles as a type.
- `&` is a parent selector shortcut. It's interpreted according to the [native nesting](https://drafts.csswg.org/css-nesting-1/) specification.

## What is supported

As a [TypeScript](https://www.typescriptlang.org/) compiler plugin, Typique can be directly used in `.ts` and `.tsx` files. You can also use Typique in other environments (e.g. Vue, Svelte, plain JavaScript) by importing a `.ts` file that contains your styles. See the [framework integration guide](./docs/Frameworks.md) for details.

## How it works

Typique provides two main features:

- **Development tooling** automates selecting correct and consistent classnames via completion and diagnostics. If the var name matches the pattern (`...Class`), completion items will be provided in the constant initializer. Inconsistent names are reported via diagnostics (red underline) with the quickfixes. For example, in the snippet above, the classnames `title-large` or `button` would be reported as invalid because they don't match the variable name.
- **Styles generation:** converts styles written in the `Css<{...}>` placeholder to plain CSS and outputs it to a single (by default) file. This is made on any file change during development, or can be made with the CLI command.

See the [Composing Class Names](./docs/ComposingClassNames.md) guide for instructions how to configure the classnames selection tooling. Other plugin settings are described in the [Configuration](./docs/Configuration.md) guide.

If you're curious how the plugin interacts with the editor, and how it affects the development process in general, check the [Plugin Description](./docs/PluginDescription.md) guide.

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
npx typique --build ./projectFile.ts --tsserver /path/to/tsserver.js -- ...ts-params
```

- `--build projectFile.ts` *(required)* — any TypeScript file in your project. It’s used to bootstrap the TypeScript project and initialize the Typique plugin. Common choices are your root component or application entry point.
- `--tsserver /path/to/tsserver.js` *(optional)* — Path to the TypeScript server executable. If not set, Typique defaults to `./node_modules/typescript/lib/tsserver.js`.
- `...ts-params` *(optional)* — any valid TypeScript [compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html).

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
  return <button className={ 'button' satisfies Css<{
    border: 'none'
    padding: `calc(${typeof unit}px * 2)`
  }> }>
    Click me
  </button>
}
```

### Nesting

The nested rules are interpreted as per the emerging [CSS Nesting Module](https://drafts.csswg.org/css-nesting-1/) specification. Currently Typique downlevels the nested CSS rules to plain objects. The support for native nesting is planned.

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

### Multiple classnames

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

Typique checks that all non-root classnames are referenced, and that all references are valid.

It's possible to also reference the root classname with `$0` which can be useful in the nested levels to back-reference the root:

```ts
const largeClass = 'large' satisfies Css<{
  div: {
    padding: '0.4em'
    '&.$0': {
      fontSize: '1.3em'
    }
  }
}
```

### Global CSS

Styles not containing root properties and `.$`-references are output as is, resulting in global CSS:

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

Typique output this CSS as is. You can also mix local and global classnames:

```ts
const flexClass = 'flx' satisfies Css<{
  display: 'flex'
  '&.hidden': {
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

### CSS variables

To ensure variable name uniqueness, use the `Var` type.

```ts
import type {Css, Var} from 'typique'

const wVar = '--w' satisfies Var
// Or, if you don't need it in the runtime:
declare const wVar: Var<'--w'>

// You can use tuples
const [bgColorVar, spaceVar] = ['--bg-color', '--space'] satisfies Var

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

### Referencing any identifier

You can use `$`-references to reference any identifier (not just class names). This is useful for things like keyframes and layers, which are otherwise global:

```ts
const [buttonClass,] = ['button', 'button-e-0'] satisfies Css<{
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

The explicitly ignored name (comma after `buttonClass`) instructs Typique to suggest the 2-places completion item inside `['']`. You can also bind it to a variable if you need it in the runtime, but to get proper name (e.g. `fadeInKeyframes`, not `fadeInClass`) you need to adjust the [`varNameRegex` config](./docs/ComposingClassNames.md):

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "plugins": [{
      "name": "typique/ts-plugin",
      "varNameRegex": "Class|Keyframes$"
    }]
  }
}
```

**page.ts:**

```ts
const [buttonClass, fadeInKeyframes] = ['button', 'fade-in'] satisfies Css<{
  animation: '$1 0.3s ease-in-out'
  '@keyframes $1': {
    // ...
  }
}>
```

### Fallbacks

Use tuple notation to assign multiple values to the same property.

```ts
const c = 'c' satisfies Css<{
  color: ['magenta', 'oklch(0.7 0.35 328)']
}>
```

### Classnames refactoring (planned)

Because classnames remain constants in the source code, they may get inconsistent as the project grows. Typique provides tools for automated detection and fixing of inconsistent classnames. See the [Composing Class Names](./docs/ComposingClassNames.md) guide.

## The library name

Typique — French for “typical”, pronounced /ti'pik/
