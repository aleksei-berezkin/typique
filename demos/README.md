# Typique Demos

All applications feature:

* Dark / light theme synchronized with your system settings
* Global styles
* Sharing vars between CSS and runtime
* Adaptive and accessible layout
* Build step to output styles as a script

## Note on TypeScript setup

All apps don't have explicits deps neither on `typescript` nor on `typique` because they are part of the monorepo workspace, therefore use `typescript` + `typique` pair from the workspace root. If opened separately in IDE, the `typescript` version from the workspace root needs to be used (for VS Code, this is configured via the `typescript.tsdk` setting in `.vscode/settings.json` in each project). This is because IDE a) can run only one version of the TypeScript server, and b) TS plugins must reside in the same `node_modules` as the workspace `typescript` installation, regardless of `tsconfig.json` location relative to the workspace root.

## nextjs-search

Searches among top-1000 English words. Standard NextJS app.

Features:

* Colocation
* Nesting and selectors
* `@property` definition
* Selecting classnames by props

Code: [./nextjs-search](./nextjs-search/), deployment: WIP

### Additional NextJS example

The full app displaying artworks from source code, see [in this repo](https://github.com/aleksei-berezkin/code-art/).

## qwik-toast

Displays a toast notification on click or tap. Standard Qwik app.

Features:

* Colocation
* Classnames random suffixes
* Keyframes
* Selecting and concatenating classnames

Code: [./qwick-toast](./qwik-toast/), deployment: WIP

## solidjs-accordion

Simple accordion controls. Standard SolidJS app.

Features:

* Colocation
* Nesting and selectors
* Classnames fixed suffixes

Code [./solidjs-accordion](./solidjs-accordion/), deployment: WIP

## svelte-progress

Circular progress which can be increased / decreased with the button controls. Standard Svelte app.

Features:

* Importing classnames from a separate file
* Nesting and selectors
* Keyframes

Code [./svelte-progress](./svelte-progress/), deployment: WIP

## vanillajs-buttons

Buttons gallery. HTML + JS without frameworks and bundlers.

Features:

* Importing class and var names from a separate file
* Nesting and selectors

## vue-todo-app

To-Do list app. Standard Vue app.

Features:

* Nesting and selectors
* Per-component CSS output
* Global plugin configuration on a build step
