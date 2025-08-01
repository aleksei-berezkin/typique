# Laim

Laim converts styles written as types into static CSS, while TypeScript naturally erases them from your build. Regardless of bundler.

## Example

```ts
const [title] = css('title') satisfies Css<{
  fontSize: '1.3rem'
  fontWeight: '300'
  textDecoration: 'underline'
  textTransform: 'uppercase'
}>
```

**Anatomy:**

- `css()` is a tiny helper function that generates class names.
- `'title'` is a unique label. Laim provides autocomplete suggestions, checks for duplicates, and offers quick fixes if collisions occur.
- `satisfies Css<{...}>` is where you define your styles as a type.

## What is supported

Laim works as a [TypeScript](https://www.typescriptlang.org/) compiler plugin, so it can be used directly in `.ts` and `.tsx` files. You can also use Laim in other environments (e.g. Vue, Svelte, plain JavaScript) by importing a `.ts` file that contains your styles. See the [framework integration guide](./docs/Frameworks.md) for details.

## Setup

The steps below are for a simple project with one `package.json` and one `tsconfig.json` in the root. For more complex setups, see the [Advanced Setup guide](./docs/AdvancedSetup.md).

### 1. Install Laim

```bash
npm i laim
```

### 2. Add the TypeScript plugin

In your `tsconfig.json`:

```json
"compilerOptions": {
  "plugins": [
    {
      "name": "laim/ts-plugin"
    }
  ]
}
```

If you're using VS Code, make sure to select the Workspace TypeScript version: **Command Palette → Select TypeScript Version → Use Workspace Version**.

### 3. Write some styles

```ts
import { css, type Css } from 'laim'

const [roundBtnClass] = css('btn') satisfies Css<{
  borderRadius: '50%'
  boxShadow: '3px 0 6px 0px rgb(60 64 67 / 55%)'
  height: '2.5rem'
  overflow: 'hidden'
  width: '2.5rem'
}>

export function RoundButton() {
  return <button className={roundBtnClass}>Hi</button>
}
```

### 4. Import the generated CSS into your app

By default, Laim outputs a single CSS file named `laim-output.css` in your project root Import it into your HTML template or entry point:

```html
<html>
<head>
  ...
  <link href="./laim-output.css" rel="stylesheet">
</head>
...
</html>
```

You can change the output file name via the plugin [configuration](./docs/Configuration.md).

### 5. Add a build step

Run the following command to compile the CSS file:

```bash
npx laim ./projectFile.ts ...ts-params
```

- `projectFile.ts` (required) — any TypeScript file in your project. It’s used to bootstrap TypeScript and initialize the Laim plugin. Common choices are your root component or application entry point.
- `...ts-params` (optional) — any valid TypeScript [compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html).

## More examples

### Sharing constants between CSS and runtime

```ts
const unit = 4

const [spaced] = css('spaced') satisfies Css<{
  padding: `calc(${unit}px * 2)`
}>

export function Button() {
  return <button className={spaced}>Unit=${unit}px</button>
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
const unit = 4                   // ✅ Type is 4
const [padded] = css('pd') satisfies Css<{
  padding: `calc(${unit}px * 2)` // ✅ Type is `calc(4px * 2)`
}>
const margin = `${unit}em`       // ✅ Type is '4em'
type  Margin = `${unit}em`       // ✅ Type is '4em'
```

### Multiple names and nesting

```ts
const [root, large, bold, small] = css('title') satisfies Css<{
  padding: '1rem'
  '&.large': {
    padding: '1.3rem'
    '&.bold': {
      fontWeight: '700'
    }
  }
  '&.small': {
    padding: '0.5rem'
    '&.bold': {
      fontWeight: '600'
    }
  }
}>
```

Laim rewrites class names in the order they appear. Identical input names map to identical output names. In the example above `bold` appears twice, and its both occurrences will be rewritten to the same final class. Laim checks that the number of requested names (on the left-hand side of `=`) matches the number of classes defined in `Css<{...}>`.

### Global CSS

To output a class exactly as written, prefix it with `$$`:

```ts
css() satisfies Css<{
  body {
    padding: 0
    margin: 0
  }
  '.$$hidden': {
    display: 'none'
  }
}>
```

This outputs `.hidden` (no rewriting).

If all classes in a block are global, the label is not required and `css()` becomes a runtime no-op. You can also mix local and global names:

```ts
const [flexClass] = css('flx') satisfies Css<{
  display: 'flex'
  '&.$$hidden': {
    display: 'none'
  }
}>
```

### CSS variables

You can use variables directly:

```ts
css() satisfies Css<{
  body: {
    '--bgColor': '#eeeeee'
    '--space': '4px'
  }
}>
```

To ensure variable name uniqueness, use the `GetVarNames<>` type or the `getVarNames()` function:

```ts
import {getVarNames, type GetVarNames} from 'laim'

declare const theme: GetVarNames<'theme', ['bgColor', 'space']>

// Or, if you need variable names in the runtime:
const theme = getVarNames('theme', ['bgColor', 'space'])

css() satisfies Css<{
  body: {
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

Both `generateVars()` and `GenerateType<>` enforce uniqueness of the passed label (`'theme'` here).

### Rewriting any name

You can instruct Laim to rewrite any identifier (not just class names) with a `%%` prefix. This is useful for things like keyframes, which are otherwise global:

```ts
const [btn,] = css('btn') satisfies Css<{
  animation: `%%fadeIn 0.3s ease-in-out`
  '@keyframes %%fadeIn': {
    from: {
        opacity: 0
    }
    to: {
        opacity: 1
    }
  }
}
```

The `%%`-prefixed names are also available on the left-hand-side, e.g. you may write `const [btn, fadeIn] = ...` but if you don't need them, ignore explicitly, as in the example above.

## The library name

[Laim](https://osm.org/go/0JAduNmV-?relation=54388) is a district of Munich, Germany.
