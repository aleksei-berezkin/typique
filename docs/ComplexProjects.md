# Settings up Typique in complex projects

This doc addresses using Typique in projects that contains multiple subprojects with the separate deps, or have reusable parts, or are themselves reusable libraries.

## Monorepos

Monorepos are workspaces which contain multiple projects having separate `node_modules`. Usually they also have multiple `tsconfig.json` files, e.g. one per sub-project. These projects have the following limitations in terms of running TypeScript:

- IDEs can only run one version of the TypeScript server per workspace, and
- Non-global TS plugins must reside in the same `node_modules` as the workspace `typescript` installation

One possible solution is installing TypeScript to the root `node_modules`, and installing all required plugins in the root `node_modules` as well.

If some monorepo subproject is opened separately in IDE, the `typescript` version from the workspace root needs to be used to have the plugin work:

- In VS Code, this is configured via `.vscode/settings.json`, which may look like `{ "typescript.tsdk": "../../node_modules/typescript/lib" }`
- In WebStorm, this is configured via **Settings** UI.

## Reusing project parts

TODO

## Classnames pattern recipes

TODO only leave shipping library case

Depending on your project scope, you might need different configurations. Here are some suggestions:

- For small to medium-large standalone projects, use the default config.
- For very large project, you may consider adding the `${random(n)}` placeholder which can be shorter than the counter. For example, 3-position counter can hold only 1000 values, whereas `${random(2)}` on a suffix position can hold even more: (26*2+10)^2 = 3844. Yet Typique doesn't need to scan the sequences to find the free name — it just generates it randomly. With enough `n`, maximum a couple of retries are needed.
- If you have multiple projects in the same bundle, you need to ensure that their classnames cannot collide. Use one of these options:
  - Add the prefix or the suffix to the class name. Use constant strings, arbitrary placeholders or the compose function for that.
  - Use the `${random(n)}`-like placeholder in your classnames. Make sure `n` is large enough to avoid collisions both inside and outside projects. Most of CSS libs use 5- or 6-position sequences for that purpose — you can proceed from this suggestion.
- The library is similar to a project in a multiple-projects bundle, yet the possible amount of other projects co-existing in the same bundle is much larger. So, use the same approach as above, yet the prefixes and random sequences should be likely longer.
- Shipping a library: the simplest way it to ship a library compiled to JS and CSS. To make it tree-shakeable, use additionally [`perFileCss` config](./Configuration.md).
