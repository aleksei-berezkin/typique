# Typique

Typique (pronounced /ti'pik/) is a framework- and bundler-agnostic, zero-runtime CSS-in-TS library powered by a TypeScript plugin. It generates readable, unique class names directly as completion items in your editor. Styles exist only as types, so they vanish cleanly from your final build.

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

**Anatomy:**

- `titleClass` follows the configurable naming convention: Typique auto-completes a readable yet unique class name in the initializer
- `'title'` is a class name suggested by Typique
- `satisfies Css<{...}>` is where you declare your styles as a type.
- `&` is the parent selector, interpreted according to the [CSS nesting](https://drafts.csswg.org/css-nesting-1/) spec.

## Why Typique

- No bundlers hell. Completely.
- No extra DX overhead — Typique piggybacks on data TypeScript already computes for the editor
- Framework-agnostic — works natively in `.ts`/`.tsx`; other files (Vue, Svelte, JS) can use it via imports from `.ts`
- Zero-friction SSR and RSC — it's just plain CSS to them
- Readable, configurable class names
- An intuitive mental model with a clean compile-time vs. runtime separation
- Easy to migrate away — generated CSS is clean and source-ready

## Documentation

- This README — continue reading for quick setup and basic examples
- [Framework Integration](./docs/Frameworks.md) — how to use Typique in files which are not compiled by the TypeScript compiler
- [Composing Class Names](./docs/ComposingClassNames.md) — how to configure the variables naming conventions, class names patterns, and how to make them unique across multiple independent projects
- [Plugin Description](./docs/PluginDescription.md) — how the Typique plugin interacts with the editor, how it affects the performance
- [Configuration](./docs/Configuration.md) — complete plugin parameters reference
- [CLI](./docs/CLI.md) — command-line interface reference

## Setup

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

Because CSS is defined as types, the task comes down to converting constants to types. The following language features can perform this for you:

#### `typeof` operator

```ts
const unit = 4
const spacedClass = 'spaced' satisfies Css<{
  padding: typeof unit // Type is 4, rendered as 4px
}>
```

#### String interpolation

This works for both types and values.

```ts
const unit = 4
const padding = `${typeof unit}em` // Type is `4em`
type Padding = `${typeof unit}em` // Same, type is `4em`
```

#### Computed properties

This is useful for CSS vars explained below.

```ts
const paddingVar = '--padding' satisfies Var
const spacedClass = 'spaced' satisfies Css<{
  [paddingVar]: 4
}>
```

#### Arithmetic operations

TypeScript doesn't directly support arithmetic operations on types, so it's easier to use CSS `calc()` function:

```ts
const unit = 4
const spacedClass = 'spaced' satisfies Css<{
  padding: `calc(${typeof unit}px * 2)`
}>
```

It's planned to introduce the precalculation of `calc()` with only constants.

### Scoped classnames, React and TSX

Styles can appear in any place in the file, not only at the top-level: Typique recognizes any `... satisfies Css<{...}>` expression as a CSS declaration. These expression can appear, for example, in functions, object literals, TSX properties etc.

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

### Nesting

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

### Multiple classnames

Array and object notations are supported.

#### Array notation

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
  div: {
    padding: '0.4em'
    '&.$0': {
      fontSize: '1.3em'
    }
  }
}>
```

#### Object notation

This notation is especially useful to define styles based on component props. More on that in [React examples](/examples/TODO).

```ts
const buttonClasses = {
  r: 'button-r',
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

Root non-object properties are associated with the first defined classname property, `r: 'button-r'` in this example. It can be also directly referenced with `.$r`. Like with array notation, all references and classnames are checked.

### Global CSS

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

### CSS variables and theming

Typique assumes theming with CSS-variables. Similar to classes, you can declare single variables, arrays and objects of them. To make sure the type is inferred as constant, not just `string`, add `as const` after the initializer. Finally, `satisfies Var` marks the variable to be checked for uniqueness.

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

### Referencing any identifier

You can use `$`-references to reference any identifier (not just class names). This is useful for things like keyframes and layers, which are otherwise global:

```ts
const [buttonClass,] = ['button', 'button-cn'] satisfies Css<{
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

### Fallbacks

Use tuple notation to assign multiple values to the same property.

```ts
const c = 'c' satisfies Css<{
  color: ['magenta', 'oklch(0.7 0.35 328)']
}>
```

### Reusing and templating CSS rule objects

Like any other TypeScript types, CSS objects can be defined as named aliases and reused multiple times; they can also be generic. Here are some examples how to use this in common patterns.

#### Dark theme

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

### Classnames refactoring (planned)

Because classnames remain constants in the source code, they may get inconsistent as the project grows. Tools for project-wide classnames refactoring are planned.
