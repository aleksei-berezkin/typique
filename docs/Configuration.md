# Plugin configuration

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

## nativeNesting

Don't preprocess nesting and `&` selectors, and rely instead on [native nesting support](https://drafts.csswg.org/css-nesting-1/). When set to `true`, Laim will leave `&` selectors untouched and output nested objects on the same level. However, if a nested block is not one of the [rules allowed for nesting](https://drafts.csswg.org/css-nesting-1/#conditionals) (for example, `@keyframes`), Laim will automatically lift it to the top level.

**Without nativeNesting:**

```ts
const [name] = css('cls') satisfies Css<{
  color: 'red'
  '@media (max-width: 600px)': {
    '&': {
      color: 'cyan'
      '&:active, &:hover': {
        color: 'magenta'
      }
    }
  }
}>
```

This outputs:

```css
.cls-0 {
  color: red;
}
@media (max-width: 600px) {
  .cls-0 {
    color: cyan;
  }
  .cls-0:active, .cls-0:hover {
    color: magenta;
  }
}
```

**With nativeNesting:**

```ts
const [name] = css('cls') satisfies Css<{
  color: 'red'
  '@media (max-width: 600px)': {
    color: 'cyan'
    '&:active, &:hover': {
      color: 'magenta'
    }
  }
}>
```

Note that you don't need to repeat `&` inside the media-query. This outputs:

```css
.cls-0 {
  color: red;
  @media (max-width: 600px) {
    color: cyan;
    &:active, &:hover {
      color: magenta;
    }
  }
}
```

## noEmit

Similarly to the same setting of `tsconfig.json`, turns off the CSS output, but leaves all diagnostics.

## prefix

Prefix all generated class names and variable names. Note that you also need to configure the prefix in the runtime, see [Advanced Setup](./AdvancedSetup.md).

## output

The name of the output file relative to the directory that contains `tsconfig.json`. Defaults to `./laim-output.css`.
