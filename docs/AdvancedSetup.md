# Advanced Setup

## Understanding the TypeScript "Project"

Laim works as a TypeScript plugin, and uniqueness assertions are scoped within the TypeScript project. Let's quickly recap, what the TypeScript project consists of:

- `tsconfig.json`, which internally known as a "Project name"
- Project roots &mdash; files which are reachable by the `include` glob yet not filtered out by the `exclude`glob in `tsconfig.json`
- Imported files &mdash; any other source files reachable from the roots via `import`s. This includes the files from your codebase and libs from `node_modules`.
- Builtins, added via `"libs"` in `tsconfig.json`
- Project references defined via `"references"` in `tsconfig.json`

TypeScript supports also the thing called the "Inferred project" &mdash; a project with no `tsconfig.json`. Laim doesn't support inferred projects.

## Example layout

This is a typical “monorepo” layout with two apps (`a`, `b`) and a library (`c`) shared between them. Let's assume all three projects use Laim.

```plaintext
a
  a.ts          // import '../c.ts'
  tsconfig.json // plugin: laim
b
  b.ts          // import '../c.ts'
  tsconfig.json // plugin: laim
c
  c.ts
```

The file `c.ts` may belong to one of three TypeScript project, depending on how it's open:

- If you compile the `a` project, the file `c.ts` will be loaded by TypeScript as a part of the project `a`. The same will happen in the editor, when you first open `a.ts`, and then open `c.ts`. Laim will assert the uniqueness of names within `a.ts` and `c.ts`, combined.
- The same is true for the `b` project. The file `c.ts` will be a part of it, if the file `b.ts` was compiled or opened first. Laim will also treat `b.ts` and `c.ts` combined as a same project.
- If you compile `c.ts` or open it in the editor without previously opening `a.ts` or `b.ts`, it will be loaded as a part of an inferred project, and Laim plugin won't be bootstrapped.

The ambiguity with `c.ts` may lead to several problems:

1. Laim won't be used when `c` is developed or built alone.
2. If `a` and `b` projects are bundled as independent apps within the same HTML document:
   1. Uniqueness of `a` and `b` combined won't be checked;
   2. The classnames from `c.ts` will be duplicated.

Below are techniques to fix these problems.

## Making the whole project a single TypeScript project

It's the easiest solution addressing all the problems. However it's not always possible because of configuration or performance reasons.

```plaintext
a
    a.ts
  - tsconfig.json
b
    b.ts
  - tsconfig.json
c
    c.ts
+ tsconfig.json
```

The root `tsconfig.json` may look like:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "laim/ts-plugin"
      }
    ]
  },
  "include": [
    "a/**",
    "b/**",
    "c/**"
  ]
}
```

## Enabling the plugin for the `c` project

This only fixes the problem 1. The idea is just to add the `c/tsconfig.json` with the plugin enabled. This allows working on the `c` project independently.

However, when you compile `a` or `b`, `c/tsconfig.json` won't be used, and `c/c.ts` will be included in the `a` or `b` projects respectively.

## Removing a directory from generating CSS

This only fixes the problem 2.2. The plugin supports `include` and `exclude` paths, with the same syntax and defaults like in [`tsconfig.json`](https://www.typescriptlang.org/tsconfig). You may add `c` to the `exclude` list of say `b/tsconfig.json` during the build step. As a result, classes of `c` will be generated only when building `a`. Be careful though: if `a` and `b` import different files of `c`, the `c` classnames will be generated only for the files used in `a`.

## Prefixing names

This is the most reliable way to avoid any possible collisions and fix the problems 2.1 and 2.2. The solution consists of two parts: configuring the plugin for compilation, and patching the global object for the runtime.

### Configuring the plugin

Pass the prefix value to the plugin in your `a/tsconfig.json`:

```json
"compilerOptions": {
  "plugins": [
    {
      "name": "laim/ts-plugin",
      "prefix": "a_"
    }
  ]
}
```

Configure the plugin in your `b/tsconfig.json` the same way.

### Patching the global object in runtime

Laim expects that the prefix is set on the global object as a value of the property with the name defined by the `prefixPropertyName` value, which is exported from the lib. The property is read and cached when the first name is generated. Make sure to set it before Laim would need it, for example, in your app entry point:

```ts
// src/entry.tsx
import { css, type Css, prefixPropertyName } from 'laim'
(typeof window === 'object' ? window : global)[prefixPropertyName] = 'a_'

const [c] = css('e') satisfies Css<{...}> // ✅ Will use prefix
```

### Notes on Next.JS

Because your entry point, `layout.tsx`, only runs on the server, make sure to patch the global object in the first client component as well:

**app/layout.tsx:**

```ts
import { css, prefixPropertyName } from 'laim'
global[prefixPropertyName] = 'a_'

const [c] = css('m') satisfies Css<{...}> // ✅ Will use prefix
```

**app/page.tsx:**

```ts
'use client'
import { css, prefixPropertyName } from 'laim'
if (typeof window === 'object')
  window[prefixPropertyName] = 'a_'

const [c] = css('m') satisfies Css<{...}> // ✅ Will use prefix
```

If your server only emits global styles (that is, invokes `css()` with no param), and doesn't create variables (with `getVarNames()`) it can omit patching:

**app/layout.tsx:**

```ts
import { css } from 'laim'

css() satisfies Css<{...}> // ✅ Doesn't need prefix
```

## Using non-literals as labels

Non-literals may be useful, for example, if you ship a component library, and cannot rely on any runtime patching, but want to get prefixed names. In this case, use interpolation to hardcode the prefix into your label:

```ts
const prefix = 'n9EyVf'
const [c] = css(`${prefix}-c`) satisfies Css<{...}>
```

Make sure to use string interpolation and not `+`-concatenation to get string literal type. In general, the label can be an expression of any kind, with the only requirement that it evaluates to a string literal type at compile time.

## Checking the global uniqueness without changing the project structure

It's similar to the solution with the global `tsconfig.json` in the project root, albeit here we create a special config file only intended for the uniqueness assertion as a separate build step. This file should be named differently, e.g. `tsconfig.laim.json`, to avoid IDE or compilers to use it.

**tsconfig.laim.json:**

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "laim/ts-plugin",
        "noEmit": true
      }
    ]
  },
  "include": [
    "a/**",
    "b/**",
    "c/**"
  ]
}
```

Running:

```sh
npx laim a/a.ts --noEmit --project tsconfig.laim.json
```

This will output any errors without generating the CSS.

Getting this check to be integrated into the development isn't straightforward, and Laim doesn't support it. One possible solution is writing another TypeScript plugin which spawns the `tsserver.js` with the Laim plugin and collects diagnostics from it.
