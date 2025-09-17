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

Defines the var names which store classnames. If name matches, Typique will suggest completion items in the constant initializer. Default value: `Class(es)?([Nn]ames?)?$`.

### Example

The following will match:

- `cn` prefix followed by a capital letter
- or the default suffix

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "classNames": {
          "varNameRegex": "^cn(?=[A-Z_])|Class(es)?([Nn]ames?)?$"
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

Defines the pattern used to generate class names. Default is `${contextName}` which means:

- The class name should be derived from the context, e.g. the variable name or the component name, which is defined by the `${contextName}` placeholder.
- Without the explicit `${counter}` or `${random(n)}` placeholders, Typique will automatically add counter in the end if the name is already used elsewhere.

### `${contextName}` placeholder

This placeholder instructs Typique to generate class names based on the context. Typique understands different contexts:

### Variable initializer

For this context, the class name is derived from the variable name, using the following heuristics:

- If the variable name matches `varNameRegex` (see above), the matched part is removed
- The name is split into `n` parts by dashes, underscores and case changes
- The parts are lowercased
- The first completion items is all parts joined by `-`
- For the rest completion items *some* parts are selected and joined by `-`. Which parts are selected depends on parts number and their value. E.g., for longs names, short parts can be omitted.

Example: `lgRoundButtonClass` will generate the following items:

- `lg-round-button`
- `lg-round`
- `round-button`
- `lg`
- `round`
- `button`

For this particular example, all parts combinations were used.

### `${counter}` placeholder

If used directly, always generates the zero-based sequence, even if the name is used for the first time.

Example: with `"pattern": "${contextName}-${counter}"`, `btnClass` will generate `btn-0`, `btn-1`, `btn-2`, and so on. First non-occupied name will be suggested as a completion item.

### `${random(n)}` placeholder

Adds a random `[a-zA-Z0-9]` string of length `n` to the completion item. When used in the beginning, the first character will be a letter.

If it happens that the generated name is already taken, Typique will generate another random name several more times. If multiple retries fail, Typique will give up and report an error suggesting to increase `n`.

Example: with `"pattern": "${contextName}-${random(3)}"`, `btnClass` will generate `btn-8Xu`, `btn-9m5`, `btn-wtQ` and so on.

### `${randomAlpha(n)}` and `${randomNumeric(n)}` placeholders

Work like `${random(n)}` placeholder, but only use `[a-zA-Z]` and `[0-9]` characters, respectively. While reducing the names variability, may sometimes read better.

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
          "pattern": "my-${contextName}"
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
          "pattern": "${cnPrefix}${contextName}"
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

## composeFunction

This user-defined function allows composing multiple classnames into a larger structure, for example: concatenated classname, or classnames object. Together with composing the classnames, the function can also add prefixes and suffixes, of which you need to inform Typique with the brand types `Prefixed` and `Suffixed`.

The config is a regex, so you can have multiple composing functions:

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "classNames": {
          "composeFunction": "^cc|co$"
        }
      }
    ]
  }
}
```

### Concatenating classnames

This is especially useful in React and TSX, where the resulting class name depends on the component's props.

**cc.ts:**

```ts
function cc(...c: (string | boolean | null | undefined)[]): string & Prefixed<'my-'> {
  return c.filter(Boolean).map(c => `my-${c}`).join(' ')
}
```

**button.tsx:**

```tsx
export function Button({large}: {large: boolean}) {
  const buttonClass = cc(
    'button' satisfies Css<{
      fontSize: 12
    }>,
    large && 'button-large' satisfies Css<{
      fontSize: 14
    }>,
  )
  return (
    <button className={ buttonClass }>
      Click me
    </button>
  )
}
```

Or, the classname can be inlined to the `className` property:

```tsx
export function Button({large}: {large: boolean}) {
  return <button className={ cc(
    'button' satisfies Css<{
      fontSize: 12
    }>,
    large && 'button-large' satisfies Css<{
      fontSize: 14
    }>,
  ) }>
    Click me
  </button>
}
```

Typique tries to understand the condition (`large &&`) to suggest meaningful names in completion items. If the condition is complex, Typique will suggest items based on `-variant` suffix.

### Collecting classnames into an object

This is also useful in React and TSX, where you can write styled-like helpers to style with objects repeating the component's shape. See the helpers implementation (`GetProps`, `styleComponent`) in `examples/react`.

**co.ts:**

```ts
// Only adds suffix
function co<C>(obj: GetProps<C>): GetProps<C> & Suffixed<'-my'> {
  Object.values(obj as any).forEach((o: any) => {
    if (typeof o === 'object')
      Object.keys(o).forEach(k => o[k]+= '-my')
  })
  return obj as any
}
```

**button.tsx:**

```tsx
function Button({className}: {large?: boolean, kind?: 'primary' | 'secondary', className?: string}) {
  return (
    <button className={className}>
      Click me
    </button>
  )
}

export const StyledButton = styleComponent(
  Button,
  co({
    root: 'button-root' satisfies Css<{
      border: 'none'
      padding: 12
    }>,
    large: 'button-large' satisfies Css<{
      padding: 14
    }>,
    kind: {
      primary: 'button-kind-primary' satisfies Css<{
        color: 'red'
      }>,
      secondary: 'button-kind-secondary' satisfies Css<{
        color: 'blue'
      }>,
    }
  }),
)
```

**page.tsx:**

```tsx
export function Page() {
  return (
    <div>
      <StyledButton large kind='primary' />
      <StyledButton kind='secondary' className='extra' />
    </div>
  );
}
```

## validate

This config enforces that class names conform to the provided `pattern` and `helperFunction`, if it's set. The default is `true`.

When the classname is found to be non-compliant, Typique will suggest quickfixes to fix it. Example:

```ts
const buttonClass = 'root' satisfies Css<{...}>
//                  ~~~~~~
```

The error text will inform that `'root'` doesn't match the `${contextName}` pattern, and the quickfix will suggest to replace `'root'` with the `'button'` (`'button-0'`, `'button-1'`, etc.) class name.

### When it's not possible to validate

Typique cannot guarantee a correct validation in case of ambiguous patterns, such as:

- Multiple `${contextName}` placeholders
- `${contextName}` adjacent to something else that may contain alphanumeric characters
- `${counter}` adjacent to something else that may contain numbers

If your pattern is intentionally ambiguous, disable the validation by setting `validate: false`.

### ${contextName} validation

Typique allows contractions to the classnames parts, yet the first char of the used part must be same as in the context name. The comparison is case-insensitive.

For example, for the `const lgRoundButtonClass`, the following classnames are valid:

- ✅ `lg-Round-Button` (and `lg-round-button-0`, `lg-round-button-1`, etc. — omitted below)
- ✅ `lg-round`
- ✅ `round-BT`
- ✅ `rnd-btn`
- ✅ `L-R-B`

The following class names are not valid, and will be suggested to fix:

- ❌ `big-round-button` (and versions with the counter suffix)
- ❌ `button-round`
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

## Classnames recipes

Depending on your project scope, you might need different configurations. Here are some suggestions:

- For small to medium-large standalone projects, use the default config.
- For very large project, you may consider adding the `${random(n)}` placeholder which can be shorter than the counter. For example, 3-position counter can hold only 1000 values, whereas `${random(2)}` on a suffix position can hold even more: (26*2+10)^2 = 3844. Yet Typique doesn't need to scan the sequences to find the free name — it just generates it randomly. With enough `n`, maximum a couple of retries are needed.
- If you have multiple projects in the same bundle, you need to ensure that their classnames cannot collide. Use one of these options:
  - Add the prefix or the suffix to the class name. Use constant strings, arbitrary placeholders or the compose function for that.
  - Use the `${random(n)}`-like placeholder in your classnames. Make sure `n` is large enough to avoid collisions both inside and outside projects. Most of CSS libs use 5- or 6-position sequences for that purpose — you can proceed from this suggestion.
- The library is similar to a project in a multiple-projects bundle, yet the possible amount of other projects co-existing in the same bundle is much larger. So, use the same approach as above, yet the prefixes and random sequences should be likely longer.

## Refactorings (planned)

As your project grows, the requirement to the classname may evolve. You may start from the default pattern, then change to `${random(n)}`-like suffix with small `n`, then increase `n`, then change to prefix etc. To support these kind of changes to the whole project, the refactoring tools are planned.
