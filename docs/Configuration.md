# Plugin configuration

Settings are passed to the plugin via the `tsconfig.json`. The following snippet shows the config object shape with the default values except objects, which are described separately.

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "generatedNames": {
          // See below
        },
        "include": ["*.ts", "*.tsx"],
        "exclude": "node_modules",
        "output": {
          // See below
        }
      }
    ]
  }
}
```

## generatedNames

Configures how Typique generates and validates the class and variable names. See the [separate doc](./ComposingClassAndVarNames.md) on it.

## include, exclude

The syntax and the defaults are same as that of the corresponding [`include`](https://www.typescriptlang.org/tsconfig/#include) and [`exclude`](https://www.typescriptlang.org/tsconfig/#exclude) settings of the `tsconfig.json`.

Note:

- Plugin's `include` cannot add anything outside the current TypeScript project. In other words, it works as an additional filter of TypeScript project's files set.
- If you modify `exclude`, the new value overrides the [default excludes](https://www.typescriptlang.org/tsconfig/#exclude), such as `node_modules`, so don't forget to list them explicitly.

## output

And object specifying details of the output CSS file. The below example shows the default values:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
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

### indent

The number of spaces to use for indentation. Defaults to `2`.

### path

The name of the output file relative to the directory that contains `tsconfig.json`. Defaults to `./typique-output.css`. Only used if `perFileCss` is `false`.

### perFileCss

Whether to generate a separate CSS file for each `.ts` and `.tsx` file. Defaults to `false`. Setting this option to `true` makes the following options ineffective:

- `path`
- `sourceFileNames`

The CSS file names are derived from the source file names by replacing the `.ts` or `.tsx` extension with `.css`, e.g. `app/page.tsx` becomes `app/page.css`.

**Warning!** Any exiting CSS files will be overwritten.

### sourceFileNames

Only used if `perFileCss` is `false`. Writes comments to the output file:

```css
/* src: app/page.tsx */
.my-component-0 {
  ...
}
/* end: app/page.tsx */
```

Paths are given relative to the project root.

**Warning!** Exposes real paths. Don't use for production.
