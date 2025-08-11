# Laim

Laim converts styles written as types into static CSS, while TypeScript naturally erases them from your build. Regardless of bundler.

## Example

```ts
import { css, type Css } from 'laim'
import { space } from './theme'

const [title] = css('title') satisfies Css<{
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

- `css()` is a tiny helper function that generates class names.
- `'title'` is a unique label. Laim provides autocomplete suggestions, checks for duplicates, and offers quick fixes if collisions occur.
- `satisfies Css<{...}>` is where you define your styles as a type.
- `&` is a parent selector shortcut. By default, it is preprocessed like in other CSS templating engines, but it can also be left as-is to rely on [native nesting support](https://drafts.csswg.org/css-nesting-1/).

## What is supported

Laim works as a [TypeScript](https://www.typescriptlang.org/) compiler plugin, so it can be used directly in `.ts` and `.tsx` files. You can also use Laim in other environments (e.g. Vue, Svelte, plain JavaScript) by importing a `.ts` file that contains your styles. See the [framework integration guide](./docs/Frameworks.md) for details.

## Setup

The steps below are for a simple project with one `tsconfig.json`. If you have multiple `tsconfig.json`, each TS project may require [names prefixing](./docs/Prefixing.md).

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

### 3. Import the generated CSS into your app

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

### 4. Add a build step

Run the following command to compile the CSS file:

```bash
npx laim ./projectFile.ts ...ts-params
```

- `projectFile.ts` (required) — any TypeScript file in your project. It’s used to bootstrap TypeScript and initialize the Laim plugin. Common choices are your root component or application entry point.
- `...ts-params` (optional) — any valid TypeScript [compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html).

## More examples

You can also check examples in the [tests directory](./test/basic).

### Sharing constants between CSS and runtime

```ts
const unit = 4

const [spaced] = css('spaced') satisfies Css<{
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
const [padded] = css('pd') satisfies Css<{
  padding:
    `calc(${typeof unit}px * 2)`  // ✅ Type is `calc(4px * 2)`
}>
const margin = `${unit}em`        // ✅ Type is '4em'
type  Margin = `${typeof unit}em` // ✅ Type is '4em'
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

#### Preprocessed or native nesting

By default, Laim substitutes any `&` selectors and lifts all nested objects to the top level, similar to many other CSS libraries. With the emerging [CSS Nesting Module](https://drafts.csswg.org/css-nesting-1/) specification, native nesting in CSS is now possible. Laim supports this through the [`nativeNesting: true`](./docs/Configuration.md) plugin option.

### Nested conditional at-rules

```ts
const [fancy] = css('fancy') satisfies Css<{
  color: 'teal'
  '@media (max-width: 600px)': {
    color: 'cyan'
    '&:active': {
      color: 'magenta'
    }
  }
}>
```

When native nesting (see above) is not enabled, Laim tries to mimic the native nesting behavior. The example above outputs the following:

```css
.fancy-0 {
  color: teal;
}
@media (max-width: 600px) {
  .fancy-0 {
    color: cyan;
  }
  .fancy-0:active {
    color: magenta;
  }
}
```

### Global CSS

Non-classes are output as is. To output a classname as written, prefix it with `$$`:

```ts
css() satisfies Css<{
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

Laim will only remove `$$` from the classname, and output the CSS as is. Note that the above example doesn't generate any names, so the label is not required, and `css()` becomes a runtime no-op.

You can also mix local and global classnames:

```ts
const [flexClass] = css('flx') satisfies Css<{
  display: 'flex'
  '&.$$hidden': {
    display: 'none'
  }
}>
```

This outputs:

```css
.flx-0 {
  display: flex;
}
.flx-0.hidden {
  display: none;
}
```

### CSS variables

To ensure variable name uniqueness, use the `cssVar()` or `cssVars()` functions, or their type counterparts `CssVar<>` and `CssVars<>`:

```ts
import {getVarNames, type GetVarNames} from 'laim'

const w = cssVar('width')
// Or, if you don't need it in the runtime:
declare const w: CssVar('width')

const theme = cssVars('theme', ['bgColor', 'space'])
// Or:
declare const theme: CssVars<'theme', ['bgColor', 'space']>

css() satisfies Css<{
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
import {CssVars} from 'laim'
declare global {
  const globalTheme: CssVars<'theme', ['color', 'bgColor']>
}
export {}
```

**page.tsx:**

```ts
/// <reference path="./globalTheme.d.ts" />

import {css, type Css} from 'laim'

const [cn] = css('theme') satisfies Css<{
  [globalTheme.color]: '#333'
  [globalTheme.bgColor]: '#fff'
}>
```

The triple-slash reference above must appear in *any* TS file that is compiled.

### Reusing and templating rule sets

Like any other object types, CSS objects can be defined as named aliases and reused multiple times. They can also be generic.

```ts
import {css, type Css, type CssVars} from 'laim'

declare const theme: CssVars<'theme', ['color', 'bgColor', 'name']>

type Light<Name extends string = '🖥️'> = {
  [theme.bgColor]: '#fff'
  [theme.name]: `"${Name}"`
}
type Dark<Name extends string = '🖥️'> = {
  [theme.bgColor]: '#444'
  [theme.name]: `"${Name}"`
}

const [light, dark] = css('page') satisfies Css<{
  body: Light
  '@media (prefers-color-scheme: dark)': {
    body: Dark
  }
  'body.light': Light<'☀️'>
  'body.dark': Dark<'🌙'>
}>
```

### Rewriting any name

You can instruct Laim to rewrite any identifier (not just class names) with a `%%` prefix. This is useful for things like keyframes and layers, which are otherwise global:

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
}>
```

The `%%`-prefixed names are also available on the left-hand-side, e.g. you may write `const [btn, fadeIn] = ...` but if you don't need them, ignore explicitly, as in the example above.

### Fallbacks

Use tuple notation to assign multiple values to the same property.

```ts
const [c] = css('c') satisfies Css<{
  color: ['magenta', 'oklch(0.7 0.35 328)']
}>
```

## Performance

On TS Server startup, Laim scans all TypeScript project files that match the plugin’s `include` and `exclude` [filters](./docs/Configuration.md), so startup may take longer in large codebases. During editing, Laim only re-evaluates changed files, which is typically fast. If you suspect performance issues, open the TS Server log and check records prefixed with `LaimPlugin::`. Most entries include the elapsed time.

If you encounter performance problems, consider:

- Limiting scanned files with the plugin’s `include` and `exclude` settings
- Splitting large files with multiple `css()` invocations into smaller ones
- Splitting large projects into smaller ones (note: you may need [labels prefixing](./docs/Prefixing.md) to ensure name uniqueness across projects)

## The library name

[Laim](https://osm.org/go/0JAduNmV-?relation=54388) is a district of Munich, Germany. Pronunciation: /'laɪm/, with “ɪ” slightly longer than in “lime”.
