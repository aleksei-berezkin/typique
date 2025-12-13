# Typique Demos

All applications feature:

* Global styles
* CSS vars
* Dark theme with `@media (prefers-color-scheme: dark)`
* Sharing data between CSS and runtime
* Responsive and accessible layout
* Build step to output styles as a script

## Note on TypeScript setup

All apps don't have explicits deps neither on `typescript` nor on `typique` because they are part of the monorepo workspace, and use `typescript` + `typique` pair from the workspace root. This is becaus:

* IDEs can only run one version of the TypeScript server, and
* TS plugins must reside in the same `node_modules` as the workspace `typescript` installation, regardless of projects' `tsconfig.json` location

If some app is opened separately in IDE, the `typescript` version from the workspace root needs to be used to have the plugin work:

* In VS Code, this is configured via `.vscode/settings.json` in each project with `{ "typescript.tsdk": "../../node_modules/typescript/lib" }`
* In WebStorm, this is configured via **Settings** UI.

## nextjs-search

Searches among top-1000 English words. Standard NextJS app.

Features:

* Colocation
* Nesting and selectors
* `@property` definition
* Selecting classnames by props using the `cc()` util
* Using mapped type to set multiple CSS properties

Code: [./nextjs-search](./nextjs-search/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/nextjs-search/

## nextjs full app

The full app displaying artworks from source code: see [its repo](https://github.com/aleksei-berezkin/code-art/).

## qwik-toast

Displays a toast notification on click or tap. Standard Qwik City app.

Features:

* Colocation
* Classnames random suffixes
* Keyframes
* Concatenating classnames from object properties using the `co()` util

Code: [./qwik-toast](./qwik-toast/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/qwik-toast/

## solidjs-accordion

Simple accordion controls. Standard SolidJS app.

Features:

* Colocation
* Nesting and selectors
* Classnames fixed suffixes

Code: [./solidjs-accordion](./solidjs-accordion/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/solidjs-accordion/

## svelte-progress

Circular progress with increase / decrease controls. Standard Svelte Kit app.

Features:

* Importing classnames from a separate file
* Nesting and selectors
* Calculating both `<svg>` geometry and its style from same constants
* Keyframes

Code [./svelte-progress](./svelte-progress/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/svelte-progress/

## vanillajs-buttons

Buttons gallery. HTML + JS without frameworks and bundlers.

Features:

* Importing class and var names from a separate file
* Nesting and selectors
* Mapped types and generics to reuse CSS fragments

Code: [./vanillajs-buttons](./vanillajs-buttons/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/vanillajs-buttons/

## vue-todo-list

To-Do list app. Standard Vue app.

Features:

* Nesting and selectors
* Global plugin configuration on a build step

Code: [./vue-todo-list](./vue-todo-list/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/vue-todo-list/
