# Typique

Bundler-agnostic, zero-runtime CSS-in-TS — powered by a TypeScript plugin.

📖 Please refer to the [GitHub repo](https://github.com/aleksei-berezkin/typique/?tab=readme-ov-file#typique) for the full documentation.

Other useful links:

- [Demos](https://github.com/aleksei-berezkin/typique/tree/main/demos)
- [Plugin configuration](https://github.com/aleksei-berezkin/typique/tree/main/docs/Configuration.md)
- [Typique Configuration for Monorepos and Shared Code](https://github.com/aleksei-berezkin/typique/tree/main/docs/MonoreposAndSharedCode.md)
- [Plugin description](https://github.com/aleksei-berezkin/typique/tree/main/docs/PluginDescription.md)

## Installation

### 1. Install workspace TypeScript and Typique

```bash
npm i -D typescript
npm i typique
```

If you use VS Code, switch to the workspace TypeScript: **Command Palette → Select TypeScript Version → Use Workspace Version**.

### 2. Add the plugin to `tsconfig.json`

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin"
      }
    ]
  }
}
```

### 3. Write some styles

Name your constants `...Class` and `...Var` to instruct Typique to suggest completion items in the constant initializers.

```ts
import type { Css, Var } from 'typique'

const sizeVar = '--size' satisfies Var
//              ^
// You will receive completion here
const roundButtonClass = 'round-button' satisfies Css<{
  //                     ^
  // You will receive completion here
  [sizeVar]: 32
  borderRadius: `calc(${typeof sizeVar} / 2)`
  height: `var(${typeof sizeVar})`
  width: `var(${typeof sizeVar})`
}>
```

### 4. Import the generated CSS into your app

```html
<html>
<head>
  ...
  <link href="./typique-output.css" rel="stylesheet">
</head>
...
</html>
```

### 5. Add a build step

```sh
npx typique --projectFile ./index.ts --tsserver ./path/to/tsserver.js -- ...ts-args
```

- `--projectFile` *(required)* — a TypeScript file used to bootstrap your project
- `--tsserver` *(optional)* — a path to the TypeScript server executable
- `...ts-args` *(optional)* — TypeScript server command-line arguments
