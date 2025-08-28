# Plugin configuration

Settings are passed to the plugin via the `tsconfig.json`, for example:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typique/ts-plugin",
        "exclude": "**/api/*"
      }
    ]
  }
}
```

## classNames

Configures suggesting the class names as completion items and their validation. See the [separate doc](./ComposingClassNames.md) on it.

## include, exclude

The syntax and the defaults are same as that of the corresponding [`include`](https://www.typescriptlang.org/tsconfig/#include) and [`exclude`](https://www.typescriptlang.org/tsconfig/#exclude) settings of the `tsconfig.json`.

Note:

- Plugin's `include` cannot add anything outside the current TypeScript project. In other words, it works as an additional filter of TypeScript project's files set.
- If you modify `exclude`, the new value overrides the [default excludes](https://www.typescriptlang.org/tsconfig/#exclude), such as `node_modules`, so don't forget to list them explicitly.

## noEmit

Similarly to the [same setting](https://www.typescriptlang.org/tsconfig/#noEmit) of `tsconfig.json`, turns off the CSS output, but leaves all diagnostics.

## outputSourceFileNames

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

## output

The name of the output file relative to the directory that contains `tsconfig.json`. Defaults to `./typique-output.css`.
