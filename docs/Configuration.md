# Plugin configuration

Settings are passed to the plugin via the `tsconfig.json`, for example:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "laim/ts-plugin",
        "exclude": "**/api/*",
        "nativeNesting": true
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

## nativeNesting

Don't preprocess nesting and `&` selectors, and rely instead on [native nesting support](https://drafts.csswg.org/css-nesting-1/). When set to `true`, Laim will leave `&` selectors untouched and output nested objects on the same level. However, if a nested block is not one of the [rules allowed for nesting](https://drafts.csswg.org/css-nesting-1/#conditionals) (for example, `@keyframes`), Laim will automatically lift it to the top level.

**Without nativeNesting:**

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

This outputs:

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

The name of the output file relative to the directory that contains `tsconfig.json`. Defaults to `./laim-output.css`.
