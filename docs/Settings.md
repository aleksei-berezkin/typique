# Plugin settings

Settings are passed to the plugin via the `tsconfig.json`, for example:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "laim/ts-plugin",
        "exclude": "**/api/*",
        "prefix": "a_"
      }
    ]
  }
}
```

## include, exclude

The syntax and the defaults are same as that of the [corresponding](https://www.typescriptlang.org/tsconfig/#include) settings of `tsconfig.json`. Note: plugin's `include` cannot add anything to the current TypeScript project. In other words, plugins's `include` and `exclude` work as an additional filter *after* the filters defined in `tsconfig.json`.

## noEmit

Similarly to the same setting of `tsconfig.json`, turns off the CSS output, but leaves all diagnostics.

## prefix

Prefix all generated class names and variable names. Note that you also need to configure the prefix in the runtime, see [Advanced Setup](./AdvancedSetup.md).

## output

The name of the output file relative to the directory that contains `tsconfig.json`. Defaults to `./laim-output.css`.
