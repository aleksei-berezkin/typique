# Composing class and css variable names

Typique is different to other CSS-in-JS/TS solutions: instead of generating names during build- or runtime, Typique generates them as you are writing the code, and suggests them to you as completion items or as code fixes. Many aspects of names generation and validation are configurable.

The following snippet shows the shape of the corresponding configuration object in `tconfig.json`. The values in the example show the default values.

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "generatedNames": {
          "classNameVarRegexp": "Class(es)?([Nn]ames?)?$",
          "varNameVarRegexp": "Vars?([Nn]ames?)?$",
          "classNameTsxPropRegexp": "^class(Name)?$",
          "pattern": "${contextName}",
          "validateAgainstPattern": true,
          "maxCounter": 999,
          "maxRandomRetries": 9,
          "defaultContextName": "cn"
        }
      }
    ]
  }
}
```

The default config works fine for standalone small to medium-large projects. Change them if only your app is anything different.

Note: other plugin config options are described in the main [configuration guide](./Configuration.md).

## classNameVarRegexp and varNameVarRegexp

It's the code conventions to instruct Typique to show the class or var names completion items in the constant initializer (when you type in the opening quote). Matching to this regexp is not required — Typique recognizes CSS and vars by `satisfies Css<{...}>` and `satisfies Var<{...}>` respectively, and may suggest you the name via code fix. That said, `classNameVarRegexp` and `varNameVarRegexp` allow you to select names a bit quicker.

Default value for `classNameVarRegexp` is `Class(es)?([Nn]ames?)?$`, which matches, for example, the following:

- `abcClass`
- `abcClasses`
- `abcClassname`
- `abcClassNames`
- `abcClassesNames`

For `varNameVarRegexp`, the default is `Vars?([Nn]ames?)?$`.

It's important that the regexp matches only a part of the name because the unmatched part is interpreted as a “name payload”, and is included to the so called “context name” explained below, which is used to generate class and var names from `pattern`.

### Example

The following pattern matches the classnames starting with `cn` followed by an uppercased letter. Note that the latter is in a non-capturing group. This is made to include it to the “context name” and to the result class name.

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "generatedNames": {
          "classNameVarRegexp": "^cn(?=[A-Z])"
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

If you compose a construct with multiple names (array or object notation), the naming rules work the same way; yet the result name includes object properties.

```ts
const cnTitle = {
  root: 'title-root',
  b: 'title-b',
} satisfies Css<{
  fontSize: 14
  '& > .$b': {
    fontWeight: 'bold'
  }
}>
```

As you open quotes in object values initializers, Typique will suggest completion items as shown in the example.

## classNameTsxPropRegexp

This instructs Typique to show completion items for the TSX prop name which accepts classnames — typically `class` or `className`. Like `classNameVarRegexp` and `varNameVarRegexp`, this config is non-mandatory, and you are allowed to have `'name' satisfies Css<{...}>` virtually anywhere. However, this config speeds up a bit the name selection.

Default value: `^class(Name)?$`.

Example of the default config working:

```tsx
function Button() {
  return <button className={ 'button-button' satisfies Css<{fontSize: 12}> } />
}
```

As you type in the opening quote inside the `className` prop expression, Typique will detect that the prop name matches the regexp, and show the completion items.

Why double `button-button`? It's because the “context name” here is evaluated to `Button/button`. See below.

## pattern

Defines the pattern used to generate class and var names from. The default is `${contextName}`. It's used as is for class names, and for variable name is always added an implicit `--` prefix.

### `${contextName}` placeholder

This placeholder instructs Typique to generate the name based on the “context name”.

#### Understanding the “context name”

The “context name” is the string derived from the specific place in the code, which includes identifies encountered in this place. Or, in other words, it's the made-up “name” derived from the “context”.

Typique can recognize two contexts: variable and function declaration.

##### Variable declaration context

In this example, the context name is `lgBt`. Note: only the name payload (unmatched part of the default `classNameVarRegexp`) is included in the context name.

```typescript
const lgBtClass = '' satisfies Css<{ ... }>
//                ^ context name is 'lgBt'
```

In the next example, because the name doesn't match the `classNameVarRegexp`, the whole name is considered the payload, and is included in the context name:

```typescript
const lgRndBt = '' satisfies Css<{ ... }>
//               ^ context name is 'lgRndBt'
```

Next example shows object notation. As seen, properties names are included in the context name as is.

```typescript
const lgBtClass = {
  root: '',
  //    ^ context name is 'lgBt/root'
  b: '',
  // ^ context name is 'lgBt/b'
  sz: {
    s: '',
    // ^ context name is 'lgBt/sz/s'
    m: '',
    // ^ context name is 'lgBt/sz/m'
  }
} satisfies Css<{ ... }>
```

##### Function declaration context

It's most useful in TSX files:

```tsx
function Button() {
  return <button className={ '' satisfies Css<{ ... }> }>
    { /*                     ^ context name is 'Button/button' */ }
    <span className={ '' satisfies Css<{ ... }> }>Click</span>
    { /*              ^ context name is 'Button/button/span' */ }
    <span className={ '' satisfies Css<{ ... }> }>Me</span>
    { /*              ^ context name is 'Button/button/span' */ }
  </button>
}
```

However, it also works in any other functions:

```ts
function Button() {
  return `<button class="${ '' satisfies Css<{ ... }> }"></button>`
  //                        ^ context name is 'Button'
}
```

#### How the “context name” is turned into a class or var name suggestion

Context names can be very long, and may contain multiple parts. Typique tries to make the best guess which parts are the most important, which can be included to the name suggestions. The best guess is output on the 1st suggestions positions; other variants may be output on other positions.

- For TSX, only the first and the last parts are considered the most important — they are included in the first suggestion. However, other combinations are still suggested.
  - `Button/button/span` produces the `button-span` suggestion on the first position, and the `button-button-span` suggestion on the second.
  - `Button/button` produces only the `button-button` suggestion
- For other contexts, up to 4 parts are selected as the most important based on their length and position — these are included in the first suggestion. Other combinations are suggested on other positions.
  - `lgBt/sz/m` produces the `lg-bt-sz-m` suggestion on the first position, and additionally `bt-sz-m`, `'lg-sz-m` and some other on other positions
  - `lgRndBt/p/sm` produces the `rnd-bt-p-sm` suggestion on the first position, and additionally `lg-rnd-bt-p-sm`, `lg-p-sm` and some other on other positions

Note that it's not required to use one of suggested names. You can manually type in the name that conforms the conforms context name. See the validation rules in the `validateAgainstPattern` section.

### Implicit counter after `${contextName}` placeholder

If the `pattern` doesn't include the explicit `${counter}` placeholder, and the generated name is already used elsewhere, then the `-${counter}` is added right after the `${contextName}`, and the generation is retried.

In the example below, the context name in both cases is the same, `title`, but the generated name in the second case is `title-0`. As if the `pattern` was `${contextName}-${counter}`.

```ts
const titleClass = 'title' satisfies Css<{ ... }>
const titleClassName = 'title-0' satisfies Css<{ ... }
//                     ^ context name is 'title'
```

### `${counter}` placeholder

If used explicitly, always generates the zero-based sequence, even if the name is used for the first time.

Example: with `"pattern": "${contextName}-${counter}"`, `btnClass` will generate `btn-0`, `btn-1`, `btn-2`, and so on. First non-occupied name will be suggested as a completion item.

### `${random(n, maxWordLen)}` placeholder

Adds a random `[a-zA-Z0-9]` string to the completion item. Args:

- `n` *(required)*: the length of the generated string
- `maxWordLen` *(optional)*: this parameter comes in handy if you use spellcheckers in your IDE. Because they usually do not expect that the code contains random strings, they mark them or their parts as misspelled. Typically, they only check "words" (lowercase letters sequences possibly starting from an uppercase, or uppercase sequences) of the length exceeding some threshold, which is usually 3. The `maxWordLen` parameter instructs Typique to not to generate sequences containing "words" longer than this limit, preventing from spellcheckers false-positives. This limit somewhat reduces the possible number of generated sequences; see [this test](../ts-plugin/maxWordLenImpact.test.ts) for details.

If it happens that the generated name is already taken, Typique will generate another random name several more times. If multiple retries fail, Typique will give up and report an error suggesting to increase `n`.

Example: with `"pattern": "${contextName}-${random(3)}"`, `btnClass` will generate `btn-8Xu`, `btn-9m5`, `btn-wtQ` and so on.

### `${randomAlpha(n, maxWordLen)}` and `${randomNumeric(n)}` placeholders

Work like `${random(n, maxWordLen)}` placeholder, but only use `[a-zA-Z]` and `[0-9]` characters, respectively. While reducing the names variability, may sometimes read better.

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

The config is a regexp, so you can have multiple composing functions:

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

## validateAgainstPattern

This config enforces that class and var names conform to the provided `pattern`. The default is `true`.

When the name is found to be non-compliant, Typique will suggest quickfixes to fix it. Example:

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

If your pattern is intentionally ambiguous, disable the validation by setting `validateAgainstPattern: false`.

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

## maxRandomRetries

Maximal number of retries when generating a unique name with the `pattern` containing random-like placeholders. Default: `9`.

## defaultContextName

The string which is used when the context name cannot be evaluated. Default: `cn`.

Examples:

```ts
console.log('' satisfies Var)
//          ^ context name is 'cn'
const [, aVar] = ['', ''] satisfies Var
//                ^ context name is 'cn'
```

## Appendix: classnames recipes

Depending on your project scope, you might need different configurations. Here are some suggestions:

- For small to medium-large standalone projects, use the default config.
- For very large project, you may consider adding the `${random(n)}` placeholder which can be shorter than the counter. For example, 3-position counter can hold only 1000 values, whereas `${random(2)}` on a suffix position can hold even more: (26*2+10)^2 = 3844. Yet Typique doesn't need to scan the sequences to find the free name — it just generates it randomly. With enough `n`, maximum a couple of retries are needed.
- If you have multiple projects in the same bundle, you need to ensure that their classnames cannot collide. Use one of these options:
  - Add the prefix or the suffix to the class name. Use constant strings, arbitrary placeholders or the compose function for that.
  - Use the `${random(n)}`-like placeholder in your classnames. Make sure `n` is large enough to avoid collisions both inside and outside projects. Most of CSS libs use 5- or 6-position sequences for that purpose — you can proceed from this suggestion.
- The library is similar to a project in a multiple-projects bundle, yet the possible amount of other projects co-existing in the same bundle is much larger. So, use the same approach as above, yet the prefixes and random sequences should be likely longer.
- Shipping a library: the simplest way it to ship a library compiled to JS and CSS. To make it tree-shakeable, use additionally [`perFileCss` config](./Configuration.md).

## Appendix: refactorings (planned)

As your project grows, the requirement to the classname may evolve. You may start from the default pattern, then change to `${random(n)}`-like suffix with small `n`, then increase `n`, then change to prefix etc. To support these kind of changes to the whole project, the refactoring tools are planned.
