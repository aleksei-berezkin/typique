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
        "include": ["**/*.ts", "**/*.tsx"],
        "exclude": "**/node_modules/**",
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

Globs defining files to be processed or skipped by the plugin. Can be a string or an array of strings.

This is an additional filter to files discovered by the TypeScript compiler. Trying to add anything outside of the current TypeScript project has no effect.

Default values:

- include: `["**/*.ts", "**/*.tsx"]`, that is, any `.ts` or `.tsx` file on any depth
- exclude: `"**/node_modules/**"`, that is, any file in any `node_modules` dir on any depth

Note: if you want to *add* something to exclusion, don't forget to repeat the `"**/node_modules/**"` pattern, e.g. your config should look like `"exclude": ["**/yourIgnoredDir/**", "**/node_modules/**"]`. Not repeating the `"**/node_modules/**"` part will result in adding all lib TS files to processing which may affect startup performance.

Globs matching is powered by [minimatch](https://github.com/isaacs/minimatch). See examples in [tests](https://github.com/isaacs/minimatch/blob/main/test/basic.js).

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

The name of the output file relative to the directory that contains `tsconfig.json`. Defaults to `./typique-output.css`. Only has effect if `perFileCss` is `false`.

### perFileCss

Whether to generate a separate CSS file for each `.ts` and `.tsx` file. Defaults to `false`. Setting this option to `true` makes the `path` option ineffective.

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
