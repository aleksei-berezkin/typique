# Plugin configuration

Settings are passed to the plugin via `tsconfig.json`. After changing the settings, restart the TypeScript server.

The snippet below shows the configuration object shape along with default values.

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "include": "**/*", // Or array
        "exclude": "**/node_modules/**", // Or array
        "namingOptions": {
          "classVarName": "Class(es)?([Nn]ame(s)?)?$",
          "varVarName": "Var(s)?([Nn]ame(s)?)?$",
          "tsxPropName": "^class(Name)?$",
          "pattern": "${contextName}",
          "validate": true,
          "maxCounter": 999,
          "maxRandomRetries": 9,
          "defaultContextName": "cn"
        },
        "output": {
          "indent": 2,
          "path": "./typique-output.css",
          "perFileCss": false,
          "sourceFileNames": false
        }
      }
    ]
  }
}
```

## include, exclude

[Minimatch](https://github.com/isaacs/minimatch) globs defining files to be processed or skipped by the plugin. Can be a string or an array of strings.

This is an additional filter applied on top of files discovered by the TypeScript compiler. Trying to include anything outside of the current TypeScript project has no effect.

Default values:

- `include`: `"**/*"` — all project files
- `exclude`: `"**/node_modules/**"` — any file in any `node_modules` directory at any depth

Minimatch globs differ from TypeScript globs. See examples:

- In minimatch' repo [tests](https://github.com/isaacs/minimatch/blob/main/test/basic.js)
- In TypeScript repo [test](https://github.com/aleksei-berezkin/typique/blob/8d440cb49473a178d37649533c335f72299a3279/packages/typique/src/ts-plugin/minimatch.test.ts)

**Note:** if you want to *add* something to the exclusion list, don’t forget to repeat the `"**/node_modules/**"` pattern. For example:

```json
{
  "exclude": ["**/yourIgnoredDir/**", "**/node_modules/**"]
}
```

Not repeating `"**/node_modules/**"` will result in all library TypeScript files being processed, which may negatively affect the performance.

## namingOptions

Defines naming conventions and details of class and CSS variable naming.

### classVarName and varVarName

Define code conventions that instruct Typique to show class or variable name completion items in the constant initializer (when you type the opening quote or backtick).

Defaults:

- `classVarName`: `Class(es)?([Nn]ame(s)?)?$`
- `varVarName`: `Var(s)?([Nn]ame(s)?)?$`

It’s important that the regexp matches only a *part* of the identifier name. The unmatched part is included in the context name, which is then used to generate class and variable names via the configured [`pattern`](#pattern).

#### Example of an alternative naming convention

The following pattern matches class name variables starting with `cn`, followed by an upper-case letter. Note that the latter is wrapped in a non-capturing group. This ensures it is included in the context name and, consequently, in the resulting class name.

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "generatedNames": {
          "classVarName": "^cn(?=[A-Z])"
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

### tsxPropName

Code convention that instructs Typique to show completion items for the TSX prop name that accepts class names — typically `class` or `className`.  
Default value: `^class(Name)?$`.

### pattern

Defines the pattern used to generate class and variable names. It’s a string that looks like JavaScript string interpolation, containing constant parts and placeholders, for example: `"my-app-${contextName}"`, `"${contextName}_${random(3)}"`, and so on.  

For CSS variable names, `--` is always implicitly prepended.

The default value is `${contextName}`.

#### `${contextName}` placeholder

This placeholder instructs Typique to generate the name based on the *context name*. The context name is a string derived from the specific place in the code and includes identifiers encountered at that location.

Context names are explained in more detail in the [main README](../README.md#context-name).

#### Implicit counter after `${contextName}` placeholder

If the `pattern` does not include an explicit `${counter}` placeholder and the generated name is already used elsewhere, `-${counter}` is appended immediately after `${contextName}`, and name generation is retried.

In the example below, the context name in both cases is `title`, but the generated name in the second case is `title-0`, because the `pattern` was implicitly treated as `${contextName}-${counter}`.

```ts
const titleClass = 'title' satisfies Css<{ ... }>
const titleClassName = 'title-0' satisfies Css<{ ... }>
```

#### Explicit `${counter}` placeholder

When used explicitly, this placeholder always generates a zero-based sequence, even if the name is used for the first time.

Example: with `"pattern": "${contextName}-${counter}"`, `const btnClass` will generate `btn-0`, `btn-1`, `btn-2`, and so on. The first non-occupied name is suggested as a completion item.

#### `${random(n, maxWordLen)}` placeholder

Adds a random `[a-zA-Z0-9]` string to the completion item.

Arguments:

- `n` *(required)*: the length of the generated string
- `maxWordLen` *(optional)*: useful if you use spellcheckers in your IDE. Since spellcheckers usually don’t expect random strings in code, they may mark them (or parts of them) as misspelled. Typically, they only check “words” (lowercase letter sequences possibly starting with an uppercase letter, or all-uppercase sequences) whose length exceeds a certain threshold, which is usually 3. The `maxWordLen` parameter instructs Typique not to generate sequences containing “words” longer than this limit, preventing spellchecker false positives. This limit slightly reduces the number of possible generated sequences; see [this test](../ts-plugin/maxWordLenImpact.test.ts) for details.

If the generated name is already taken, Typique will retry and generate another random name [several](#maxrandomretries) times.

Example: with `"pattern": "${contextName}-${random(3)}"`, `btnClass` may generate `btn-8Xu`, `btn-9m5`, `btn-wtQ`, and so on.

#### `${randomAlpha(n, maxWordLen)}` and `${randomNumeric(n)}` placeholders

Work like the `${random(n, maxWordLen)}` placeholder, but use only `[a-zA-Z]` and `[0-9]` characters, respectively.

#### Constant strings

The `pattern` may contain any number of constant strings, which are emitted as-is. This is useful, for example, to prefix or suffix a class name.

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

#### Arbitrary placeholders

Any unrecognized placeholders are inserted as-is. This can be used, for example, to define a constant reference to a prefix or suffix without repeating the prefix/suffix value in every class or CSS variable name.

The reference specified here is not managed by Typique; it’s assumed that you import or define it manually.

Example:

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "classNames": {
          "pattern": "${contextName}_${suf}"
        }
      }
    ]
  }
}
```

**page.ts:**

```ts
import {suf} from '@/suf'
const buttonClass = `button_${suf}`
```

**suf.ts:**

```ts
export const suf = 'U9z1Ap4gHi'
```

### validate

This option enforces that class and variable names conform to the provided `pattern`. The default value is `true`.

When a name is found to be non-compliant, Typique [underlines](../README.md#class-and-css-variable-name-validation) the issue and provides quick fixes to correct it.

#### How different placeholders are validated

- `${contextName}` — allowed to omit parts (for example, for the context name `lgBtn`, `bt` is a valid class name), and to omit non-first characters of parts (for the same example, `l-b` is also a valid class name).
- `${counter}` — if present, it is checked to be a valid number. It is not verified whether the number belongs to a continuous sequence.
- `${random(n, maxWordLen)}`-like placeholders — the set of used characters is validated, and the `maxWordLen` constraint (if provided) is enforced.

#### When validation is not possible

Typique cannot guarantee correct validation in cases of ambiguous patterns, such as:

- Multiple `${contextName}` placeholders
- `${contextName}` adjacent to other parts that may contain alphanumeric characters
- `${counter}` adjacent to other parts that may contain numbers

### maxCounter

Typique does not store sequences of class names. Instead, when generating a class name, it checks counter values sequentially. This option defines the maximum counter value to try before Typique gives up. Default: `999`.

### maxRandomRetries

The maximum number of retries when generating a unique name with a `pattern` that contains random-like placeholders. Default: `9`.

### defaultContextName

The string used when the context name cannot be evaluated. Default: `cn`.

Examples:

```ts
console.log('' satisfies Var)
//          ^ context name is 'cn'
const [aVar] = ['--a', ''] satisfies Var
//                     ^ context name is 'cn'
```

## output

An object specifying details of the output CSS file.

### indent

The number of spaces to use for indentation. Default: `2`.

### path

The name of the output file relative to the directory that contains `tsconfig.json`. Default: `./typique-output.css`. Only has effect if [`output/perFileCss`](#perfilecss) is `false`.

### perFileCss

Whether to generate a separate CSS file for each source file. Default: `false`. Setting this option to `true` makes the [`output/path`](#path) option ineffective.

The CSS file names are derived from the source file names by replacing the extension with `.css`, for example, `app/page.tsx` becomes `app/page.css`.

**Warning.** Any existing CSS files will be overwritten.

### sourceFileNames

Writes comments to the output file:

```css
/* src: app/page.tsx */
.my-component-0 {
  ...
}
/* end: app/page.tsx */
```

Paths are given relative to the project root.

**Warning.** Exposes real paths. Do not use in production.
