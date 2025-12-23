# Plugin configuration

Settings are passed to the plugin via the `tsconfig.json`. The following snippet shows the config object shape with the default values.

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

Globs defining files to be processed or skipped by the plugin. Can be a string or an array of strings.

This is an additional filter to files discovered by the TypeScript compiler. Trying to add anything outside of the current TypeScript project has no effect.

Default values:

- include: `"**/*` — all project files
- exclude: `"**/node_modules/**"` — any file in any `node_modules` dir on any depth

Note: if you want to *add* something to exclusion, don't forget to repeat the `"**/node_modules/**"` pattern, e.g. your config should look like `"exclude": ["**/yourIgnoredDir/**", "**/node_modules/**"]`. Not repeating the `"**/node_modules/**"` part will result in adding all lib TS files to processing which may affect startup performance.

Globs matching is powered by [minimatch](https://github.com/isaacs/minimatch). See examples in [tests](https://github.com/isaacs/minimatch/blob/main/test/basic.js).

## namingOptions

Defines naming conventions and details of class/css-var naming.

### classVarName and varVarName

Defines the code conventions to instruct Typique to show the class or var names completion items in the constant initializer (when you type in the opening quote). Defaults: `Class(es)?([Nn]ame(s)?)?$`, and `Var(s)?([Nn]ame(s)?)?$`, respectively.

It's important that the regexp matches only a part of the name because the unmatched part is interpreted as a “name payload”, and is included to the context name, which is used to generate class and var names using `pattern`.

#### Example of an alternative naming convention

The following pattern matches the classnames starting with `cn` followed by an uppercased letter. Note that the latter is in a non-capturing group. This is made to include it to the context name and to the result class name.

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

### tsxPropName

Code convention that instructs Typique to show completion items for the TSX prop name which accepts classnames — typically `class` or `className`. Default value: `^class(Name)?$`.

### pattern

Defines the pattern used to generate class and var names from. It's a string looking like JS string interpolation, containing constant parts and placeholders, for example: `"my-app-${contextName}"`, `"${contextName}_${random(3)}"` etc. For variable names, the `--` is always implicitly prepended.

The default is `${contextName}`.

#### `${contextName}` placeholder

This placeholder instructs Typique to generate the name based on the context name, which is is the string derived from the specific place in the code, which includes identifies encountered in this place. Or, in other words, it's the made-up “name” derived from the “context”.

Context names are explained in more details in the [main README](../README.md#context-name).

#### Implicit counter after `${contextName}` placeholder

If the `pattern` doesn't include the explicit `${counter}` placeholder, and the generated name is already used elsewhere, then the `-${counter}` is added right after the `${contextName}`, and the generation is retried.

In the example below, the context name in both cases is the same, `title`, but the generated name in the second case is `title-0`, because the `pattern` was implicitly changed to `${contextName}-${counter}`.

```ts
const titleClass = 'title' satisfies Css<{ ... }>
const titleClassName = 'title-0' satisfies Css<{ ... }
```

#### Explicit `${counter}` placeholder

If used explicitly, always generates the zero-based sequence, even if the name is used for the first time.

Example: with `"pattern": "${contextName}-${counter}"`, `const btnClass` will generate `btn-0`, `btn-1`, `btn-2`, and so on. First non-occupied name will be suggested as a completion item.

#### `${random(n, maxWordLen)}` placeholder

Adds a random `[a-zA-Z0-9]` string to the completion item. Args:

- `n` *(required)*: the length of the generated string
- `maxWordLen` *(optional)*: this parameter comes in handy if you use spellcheckers in your IDE. Because they usually do not expect that the code contains random strings, they mark them or their parts as misspelled. Typically, they only check "words" (lowercase letters sequences possibly starting from an uppercase, or uppercase sequences) of the length exceeding some threshold, which is usually 3. The `maxWordLen` parameter instructs Typique to not to generate sequences containing "words" longer than this limit, preventing from spellcheckers false-positives. This limit somewhat reduces the possible number of generated sequences; see [this test](../ts-plugin/maxWordLenImpact.test.ts) for details.

If it happens that the generated name is already taken, Typique will generate another random name several more times.

Example: with `"pattern": "${contextName}-${random(3)}"`, `btnClass` will generate `btn-8Xu`, `btn-9m5`, `btn-wtQ` and so on.

#### `${randomAlpha(n, maxWordLen)}` and `${randomNumeric(n)}` placeholders

Work like `${random(n, maxWordLen)}` placeholder, but only use `[a-zA-Z]` and `[0-9]` characters, respectively. While reducing the names variability, may sometimes read better.

#### Constant strings

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

#### Arbitrary placeholders

Any unrecognized placeholders are inserted as is. This can be used, for example, to define a constant reference to a prefix or a suffix, without repeating the prefix/suffix value in each class/css-var name. The reference specified here is not managed by Typique. It's assumed that you manually import or define it.

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

This config enforces that class and var names conform to the provided `pattern`. The default is `true`.

When the name is found to be non-compliant, Typique will underline this problem and provide quickfixes to fix it. Example:

#### How different placeholders are validated

- `${contextName}` — is allowed to omit parts (e.g., for `lgBtn` name, `bt` is the correct classname), and to omit non-first chars of parts (for the same example, `l-b` is the correct classname).
- `${counter}` — if present, is checksed that it's the valid number. It's not checked if the number is really an item of a continuous sequence.
- `${random(n, maxWordLen)}`-alike placeholders — used chars are checked, and not exceeding `maxWordLen` (if provided) is checked.

#### When it's not possible to validate

Typique cannot guarantee a correct validation in case of ambiguous patterns, such as:

- Multiple `${contextName}` placeholders
- `${contextName}` adjacent to something else that may contain alphanumeric characters
- `${counter}` adjacent to something else that may contain numbers
- Constants and arbitrary placeholders are checked to match the `pattern` as-is.

### maxCounter

Typique doesn't store sequences of classnames, and instead, when the class name is generated, checks all counter values one by one. This config defines the last value to check, after which Typique gives up. Default: `999`.

### maxRandomRetries

Maximal number of retries when generating a unique name with the `pattern` containing random-like placeholders. Default: `9`.

### defaultContextName

The string which is used when the context name cannot be evaluated. Default: `cn`.

Examples:

```ts
console.log('' satisfies Var)
//          ^ context name is 'cn'
const [, aVar] = ['', ''] satisfies Var
//                ^ context name is 'cn'
```

## output

And object specifying details of the output CSS file.

### indent

The number of spaces to use for indentation. Defaults to `2`.

### path

The name of the output file relative to the directory that contains `tsconfig.json`. Defaults to `./typique-output.css`. Only has effect if `output/perFileCss` is `false`.

### perFileCss

Whether to generate a separate CSS file for each `.ts` and `.tsx` file. Defaults to `false`. Setting this option to `true` makes the `output/path` option ineffective.

The CSS file names are derived from the source file names by replacing the extension with `.css`, e.g. `app/page.tsx` becomes `app/page.css`.

**Warning!** Any exiting CSS files will be overwritten.

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

**Warning!** Exposes real paths. Don't use for production.
