# Prefixing names

Let's consider this typical “monorepo” layout with several TypeScript projects each of which uses Laim:

```plaintext
a
  a.ts
  tsconfig.json
b
  b.ts
  tsconfig.json
```

From the perspective of TypeScript, `a` and `b` are two different project, and each one will have its own Laim plugin instance. This means that classnames uniqueness will be asserted within each project independently. If these projects are apps in the same bundle, this can result in classnames collisions. The best solution is to prefix generated classnames for each project. Below are techniques to do this.

## Non-literal labels

Labels passed to the `css()` function may be expressions of any kind, including interpolations and function calls. The only requirement is that they evaluate to a string constant at the compile time.

```ts
function prefix<const N extends string>(n: N) {
  return `my-prefix-${n}` as const
}
const [c] = css(prefix('c')) satisfies Css<{...}>
```

## Providing your own runtime functions

Laim plugin recognizes its routines by name, without making deep resolve to find out the actual package. Something named `css()` and imported from the package named `laim` will be recognized as a function producing classnames. This means you can in fact use any other implementation provided it looks the same on the client side. This implementation can, for example, prefix all generated classnames. To prefix names in the emitted CSS, pass the `prefix` parameter to Laim plugin.

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "paths": {
      "laim": ["./my-laim.ts"]
    },
    "plugins": [
      {
        "name": "laim/ts-plugin",
        "prefix": "my-prefix-"
      }
    ]
  }
}
```

**my-laim.ts:**

```typescript
import { css as realCss } from '../node_modules/laim';
export function css(): void
export function css(label: string): IterableIterator<string>
export function* css(label?: string): IterableIterator<string> {
  if (label != null)
    for (const c of realCss(label))
      yield `my-prefix-${c}`
}
export type Css<_T extends object> = any
```

You are also free to rewrite the runtime from scratch. For example, if you compile to a very old environment and don't want to downlevel generators, you can implement `css()` using plain arrays. You can also pass additional parameters to the functions, however Laim plugin can't check them.

**my-laim-es5.ts:**

```typescript
export function css(): void
export function css(label: string, count: number): string[]
export function css(label?: string, count?: number): string[] {
  var classNames: string[] = []
  if (label != null)
    for (let i = 0; i < count!; i++)
      classNames.push('my-prefix-' + label + '-' + i)
  return classNames
}
```
