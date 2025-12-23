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
        },
        // OR maybe
        "namingOptions": {
          "classVarName": "Class(es)?([Nn]ames?)?$",
          "varVarName": "Vars?([Nn]ames?)?$",
          "tsxPropName": "^class(Name)?$",
          "pattern": "${contextName}",
          "validate": true,
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
