# Typique Configuration for Monorepos and Shared Code

This doc addresses using Typique in projects that have shared parts, or are shared themselves, which require configuration adjustments to guarantee names uniqueness.

## Using Typique in Monorepos

Monorepos are workspaces which contain multiple projects having separate `node_modules`. Usually they also have multiple `tsconfig.json` files, e.g. one per sub-project. These projects have the following limitations in terms of running TypeScript:

- IDEs can only run one version of the TypeScript server per workspace, and
- Non-global TS plugins must reside in the same `node_modules` as the workspace `typescript` installation

The most common solution is installing TypeScript to the root `node_modules`, and installing all required plugins in the root `node_modules` as well.

If some monorepo subproject is opened separately in IDE, the `typescript` version from the workspace root needs to be used to have the plugin work. The setup is IDE-specific:

- In VS Code, this is configured via `.vscode/settings.json`, which may look like `{ "typescript.tsdk": "../../node_modules/typescript/lib" }`
- In WebStorm, this is configured via **Settings** UI

## Sharing a Subproject Within a Workspace

Consider the following project structure:

```plaintext
workspace/
├── project-a/
│   ├── index.ts
│   ├── tsconfig.json
│   └── typique-output.css
├── project-b/
│   ├── index.ts
│   ├── tsconfig.json
│   └── typique-output.css
└── shared/
    └── components.ts
```

Now, where does `shared/components.ts` belong — to `project-a` or to `project-b`? And the answer is: to both. Typescript will load two copies of `shared/components.ts`, two instances of Typique plugin — one per project — which leads to ambiguous classnames in `shared/components.ts`.

One possible solution to this problem is TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html). This effectively changes `shared` to a separate TypeScript project, and any imports from `shared` resolve to its *output* (`.d.ts` + `.js`) files. The file structure will slightly change:

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

Now, because all files are orthogonal now, you can use various [naming options](./docs/Configuration.md#namingoptions) per project to guarantee names uniqueness. You will also need to import `shared/typique-output.css` both into `project-a` and `project-b` because projects' output files don't contain styles from `shared` anymore.

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

A library is similar to workspace subproject, with some additional measures possible.

- Make sure to import only lib output files (`.d.ts`, `.js`), not `.ts` files
- Use [naming options](./docs/Configuration.md#namingoptions) with somewhat long prefixes or suffixes
- Consider using [perFileCss](./Configuration.md#perfilecss) to allow tree-shaking
