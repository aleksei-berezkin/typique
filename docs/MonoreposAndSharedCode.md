# Typique Configuration for Monorepos and Shared Code

This document explains how to use Typique in projects that contain shared parts, or that are themselves shared, and therefore require configuration adjustments to guarantee name uniqueness.

## Using Typique in Monorepos

Monorepos are workspaces that contain multiple projects with separate `node_modules`. They usually also have multiple `tsconfig.json` files, for example one per subproject. These projects have the following limitations when running TypeScript:

- IDEs can run only one version of the TypeScript server per workspace, and
- Non-global TypeScript plugins must reside in the same `node_modules` directory as the workspace `typescript` installation.

The most common solution is to install TypeScript in the root `node_modules`, and to install all required plugins in the root `node_modules` as well.

If a monorepo subproject is opened separately in an IDE, the TypeScript version from the workspace root must be used for the plugin to work. The setup is IDE-specific:

- In VS Code, this is configured via `.vscode/settings.json`, which may look like `{ "typescript.tsdk": "../../node_modules/typescript/lib" }`
- In WebStorm, this is configured via the **Settings** UI

Typique [Demos](../demos/) are configured exactly that way.

## Sharing a Subproject Within a Workspace

Consider the following workspace structure:

```plaintext
workspace/
├── project-a/
│   ├── index.ts
│   ├── tsconfig.json       (typique/ts-plugin)
│   └── typique-output.css
├── project-b/
│   ├── index.ts
│   ├── tsconfig.json       (typique/ts-plugin)
│   └── typique-output.css
└── shared/
    └── components.ts
```

Now, where does `shared/components.ts` belong — to `project-a` or to `project-b`? The answer is: to both. TypeScript will load two copies of `shared/components.ts` and two instances of the Typique plugin — one per project — which leads to ambiguous class names in `shared/components.ts`.

One possible solution to this problem is TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html). This effectively turns `shared` into a separate TypeScript project, and any imports from `shared` resolve to its *output* (`.d.ts` + `.js`) files. The file structure will change slightly:

```plaintext
workspace/
├── project-a/
│   ├── index.ts
│   ├── tsconfig.json      (+ref to ../shared)
│   └── typique-output.css
├── project-b/
│   ├── index.ts
│   ├── tsconfig.json      (+ref to ../shared)
│   └── typique-output.css
└── shared/
    ├── components.ts
    ├── tsconfig.json      (+)
    └── typique-output.css (+)
```

Now, because all files are isolated, you can use different [naming options](./docs/Configuration.md#namingoptions) per project to guarantee name uniqueness. You will also need to import `shared/typique-output.css` into both `project-a` and `project-b`, because the projects’ output files no longer contain styles from `shared`.

## If Sharing `.ts` Files Is Still Required

This usually happens with tests, especially when using recent Node.js versions that can run `.ts` files without transpilation.

```plaintext
workspace/
├── project-a/
│   ├── index.ts
│   └── tsconfig.json  (typique/ts-plugin)
└── test/
    ├── index.test.ts  (imports ../project-a/index.ts)
    └── tsconfig.json  (no plugin)
```

If you open both `test/index.test.ts` and `project-a/index.ts`, the TypeScript server loads two separate projects and two instances of `project-a/index.ts` — one per project.

Only one of these projects (`project-a`) has the Typique plugin enabled. It is up to the TypeScript server to decide which project instance is used for editor features in `project-a/index.ts`. In some cases, it may choose the `test/tsconfig.json` project instead, which results in the Typique plugin not working.

A simple workaround is to close all files except `project-a/index.ts` and restart the TypeScript server. This increases the likelihood that the file is associated with the correct project.

## Shipping a Library

A library is similar to a workspace subproject, with a few additional considerations:

- Make sure to import only the library’s output files (`.d.ts`, `.js`), not its `.ts` sources
- Use [naming options](./docs/Configuration.md#namingoptions) with sufficiently long prefixes or suffixes
- Consider using [`perFileCss`](./Configuration.md#perfilecss) to enable tree-shaking
