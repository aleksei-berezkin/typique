# Composing class names

Typique is different to other zero-runtime CSS-in-JS/TS solutions: it doesn't generate class names behind the scenes — instead, classnames reside explicitly in the source code. Typique provides extensive tooling for automated classnames generation during development, classnames validation rules with corresponding quickfixes, and refactorings to change the classnames in the whole project.

The default config works fine for standalone small to medium-large projects. If your app is anything different, you might need to tune it.

The classnames config is provided as a configuration object by the key `classNames` in the plugin configuration in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts",
        "classNames": {
          ...
        }
      }
    ]
  }
}
```

Note: other config options are described in the main [configuration guide](./Configuration.md).

## varNameRegex

Defines the var names which store classnames. If name matches, Typique will suggest completion items in the constant initializer. Default value: `Class([Nn]ame)?$`.

### Example

The following will match:

- `cn` prefix followed by a capital letter
- `Class`, `ClassName`, or `Classname` suffix — just like the default config

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "classNames": {
          "varNameRegex": "^cn(?=[A-Z_])|Class([Nn]ame)?$"
        }
      }
    ]
  }
}
```

Result:

```ts
const cnRoundButton = 'round-button'
```

As you type the opening quote, Typique will suggest completion items. Note that in WebStorm you might need to invoke the explicit completion (Ctrl+Space) to see the suggestions.

### Regex requirements

It's important that the regex matches only a part of the name because the unmatched part is interpreted as a “name payload”, and is used to generate class names from. That is the reason the above example uses non-capturing lookahead group `(?=[A-Z_])` to match the capital letter / underscore. If it were `cn[A-Z_]`, then Typique would suggest `ound-button` as a class name, not `round-button`.

## pattern

Defines the pattern used to generate class names. Default is `${varName}` which means:

- The class name should be derived from the variable name, which is defined by the `${varName}` placeholder.
- Without the explicit `${counter}` or `${random(n)}` placeholders, Typique will automatically add counter in the end if the name is already used elsewhere.

### `${varName}` placeholder

This placeholder instructs Typique to generate class names based on the variable name. Depending on the variable name, the placeholder may generate several completion items using the following heuristics:

- The variable name is matched against `varNameRegex` (see above)
- The unmatched part of the name (the name payload) is split into `n` parts by underscores and case changes
- The first produced completion item is `parts.join('-')`, next one is `parts.slice(1).join('-')`, and so on.

Example: `lgRoundButtonClass` will generate `lg-round-button`, `round-button`, and `button` completion items.

### `${counter}` placeholder

If used directly, always generates the zero-based sequence, even if the name is used for the first time.

Example: with `"pattern": "${varName}-${counter}"`, `btnClass` will generate `btn-0`, `btn-1`, `btn-2`, and so on. First non-occupied name will be suggested as a completion item.

### `${random(n)}` placeholder

Adds a random `[a-zA-Z0-9_-]` string of length `n` to the completion item. When used in the beginning, the first character will be a letter.

If it happens that the generated name is already taken, Typique will generate another random name several more times. If multiple retries fail, Typique will give up and report an error suggesting to increase `n`.

Example: with `"pattern": "${varName}-${random(3)}"`, `btnClass` will generate `btn-8Xu`, `btn-9m-`, `btn-_tQ` and so on.

### `${randomAlpha(n)}`, `${randomNumeric(n)}`, and `${randomAlphaNumeric(n)}` placeholders

Work like `${random(n)}` placeholder, but only use `[a-zA-Z]`, `[0-9]`, and `[a-zA-Z0-9]` characters, respectively. While reducing the names variability, may read somewhat better.

### Constant strings

The `pattern` may contain any amount of constant strings which are output as is. Use it if you want, for example, to prefix or suffix the classname.

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "classNames": {
          "pattern": "my-${varName}"
        }
      }
    ]
  }
}
```

**page.ts:**

```ts
const buttonClass = 'my-button'
```

As you type in the opening quote, Typique will suggest completion items as shown above.

### Arbitrary placeholders

Any unrecognized placeholders are inserted verbatim, which allows referencing constants defined elsewhere. This adds more flexibility for classnames prefixing and suffixing. For example, you can have different prefixes for different builds, or completely omit prefixing for development. However, remember to keep to these rules:

- The referenced variables must be compile-time constants
- The runtime value must be the same as the compile-time value

To change the prefix, you can, for example, manipulate the `.d.ts` files and `webpack.DefinePlugin` config during build. The following example shows this.

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "classNames": {
          "pattern": "${cnPrefix}${varName}"
        }
      }
    ]
  }
}
```

**global.d.ts:**

```ts
declare const cnPrefix: 'my-'
```

**webpack.config.js:**

```js
import { default as webpack } from 'webpack'

export default {
  plugins: [
    new webpack.DefinePlugin({
      cnPrefix: "'my-'"
    })
  ]
}
```

**page.ts:**

```ts
const buttonClass = `${cnPrefix}button`
```

As you type in the opening backtick, Typique will suggest the completion item as shown above. During build, the `DefinePlugin` will replace the `cnPrefix` identifier with the `'my-'` value, which is then likely inlined by a minifier, resulting in a plain constant `'my-button'`, leaving no runtime overhead behind.

## helperFunction

This config allows wrapping the class name constants in a user-defined function invocation. This works similar as the arbitrary placeholders described above, yet it reads a bit nicer, especially for multiple classnames. However, because Typique requires compile-time constants, the function definition is somewhat verbose.

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "classNames": {
          "helperFunction": "cn"
        }
      }
    ]
  }
}
```

**cn.ts:**

```ts
const p = 'my-'
type P = typeof p
export function cn<C extends string>(c: C): `${P}${C}`
// Multiple classnames: Typique expects vararg-like args, not tuple
export function cn<C extends string, D extends string>(c: C, d: D): [`${P}${C}`, `${P}${D}`]
export function cn<C extends string, D extends string, E extends string>(c: C, d: D, e: E): [`${P}${C}`, `${P}${D}`, `${P}${E}`]
// ... as many as you need
export function cn(...args: string[]) {
  return args.length === 1 ? `${p}${args[0]}` : args.map(a => `${p}${a}`)
}
```

**page.ts:**

```ts
const buttonClass = cn('button') satisfies Css<{...}>
```

The completion items will be suggested once you open a quote inside the `cn()` parens. The result class name is `'my-button'`, both in compile- and runtime.

Note that Typique expects that the function doesn't discard or swap the passed classnames. This is needed to match the passed arguments with members of the returned tuple elements.

## validate

This config enforces that class names conform to the provided `pattern` and `helperFunction`, if it's set. The default is `true`.

When the classname is found to be non-compliant, Typique will suggest quickfixes to fix it. Example:

```ts
const buttonClass = 'root' satisfies Css<{...}>
//                  ~~~~~~
```

The error text will inform that `'root'` doesn't match the `${varName}` pattern, and the quickfix will suggest to replace `'root'` with the `'button'` (`'button-0'`, `'button-1'`, etc.) class name.

### ${varName} validation

Typique allows contractions to the classnames, yet the first char of the used component must be same (case-insensitive) as in the variable name. For example, for the `const lgRoundButtonClass`, the following classnames are valid:

- ✅ `lg-round-button` (and `lg-round-button-0`, `lg-round-button-1`, etc. — omitted below)
- ✅ `round-bt`
- ✅ `rnd-btn`
- ✅ `l-r-b`

The following class names are not valid, and will be suggested to fix:

- ❌ `big-round-button` (and versions with the counter suffix)
- ❌ `nd-bt`
- ❌ `l_r_b`

### `${counter}` validation

If present, Typique checks that it's the valid number. However it doesn't check if the number is really an item of a continuous sequence.

### `${random(n)}`-alike validation

Typique checks the length and used characters of the value.

### Arbitrary placeholders and helpers validation

If configured, arbitrary placeholders and helpers must be written exactly as defined in the config.

## maxCounter

Typique doesn't store sequences of classnames, and instead, when the class name is generated, checks all counter values one by one. The `maxConfig` defines the last value to check, after which Typique gives up and reports an error. Default: `999`.

## Recipes

Depending on your project scope, you might need different configurations. Here are some suggestions:

- For small to medium-large standalone projects, use the default config.
- For very large project, you may consider adding the `${random(n)}` placeholder which can be shorter than the counter. For example, 3-position counter can hold only 1000 values, whereas `${randomAlphaNumeric(2)}` on a suffix position can hold even more: (26*2+10)^2 = 3844. Yet Typique doesn't need to scan the sequences to find the free name — it just generates it randomly. With enough `n`, maximum a couple of retries are needed.
- If you have multiple projects in the same bundle, you need to ensure that their classnames cannot collide. Use one of these options:
  - Add the prefix or the suffix to the class name. Use constant strings, arbitrary placeholders or the helper function for that.
  - Use the `${random(n)}`-like placeholder in your classnames. Make sure `n` is large enough to avoid collisions both inside and outside projects. Most of CSS libs use 5- or 6-position sequences for that purpose — you can proceed from this suggestion.
- The library is similar to a project in a multiple-projects bundle, yet the possible amount of other projects co-existing in the same bundle is much larger. So, use the same approach as above, yet the prefixes and random suequences should be likely longer.

## Refactorings

As your project grows, the requirement to the classname may evolve. You may start from the default pattern, then change to `${random(n)}`-like suffix with small `n`, then increase `n`, then change to prefix etc. To support these kind of changes to the whole project, Typique provides the cmd utility:

```bash
npx typique --fixClassNames ./projectFile.ts -- ...ts-params
```

The utility scans the whole TypeScript project bootstrapped by the provided `projectFile.ts` (which is any project file), detects non-compliant classnames, and asks for confirmation to apply changes. To skip the confirmation, use the `--force` cmd arg:

```bash
npx typique --fixClassNames --force ./projectFile.ts -- ...ts-params
```
