# Typique Demos

All applications showcase:

- CSS variables
- Global styles
- Sharing data between CSS and runtime
- A dark theme using `@media (prefers-color-scheme: dark)`
- Responsive and accessible layouts
- A build step that outputs styles as a script
- A TypeScript + Typique [monorepo setup](../docs/ComplexProjects.md#monorepos)

## nextjs-combobox

Searches among the top 1,000 English words. A standard Next.js app.

Features:

- Colocation
- Nesting and selectors
- `@property` definitions
- Selecting class names based on props using the `cc()` utility
- Using mapped types to set multiple CSS properties

Code: [./nextjs-combobox](./nextjs-combobox/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/nextjs-combobox/

## nextjs full app

A full application displaying artworks from source code. See [its repository](https://github.com/aleksei-berezkin/code-art/).

## qwik-toast

Displays a toast notification on click or tap. A standard Qwik City app.

Features:

- Colocation
- Classnames random suffixes
- Keyframes
- Selecting class names from object properties using the `co()` utility

Code: [./qwik-toast](./qwik-toast/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/qwik-toast/

## solidjs-accordion

Simple accordion controls. A standard SolidJS app.

Features:

- Colocation
- Nesting and selectors
- Fixed class name suffixes

Code: [./solidjs-accordion](./solidjs-accordion/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/solidjs-accordion/

## svelte-progress

A circular progress indicator with increase/decrease controls. A standard SvelteKit app.

Features:

- Importing class names from a separate file
- Nesting and selectors
- Calculating both `<svg>` geometry and its styles from the same constants
- Keyframes

Code [./svelte-progress](./svelte-progress/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/svelte-progress/

## vanillajs-buttons

A buttons gallery built with plain HTML and JavaScript, without frameworks or bundlers.

Features:

- Importing class and CSS variable names from a separate file
- Nesting and selectors
- Using mapped types and generics to reuse CSS fragments

Code: [./vanillajs-buttons](./vanillajs-buttons/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/vanillajs-buttons/

## vue-todo-list

A to-do list app. A standard Vue app.

Features:

- Nesting and selectors
- Global plugin configuration in the build step

Code: [./vue-todo-list](./vue-todo-list/)

Deployment: https://aleksei-berezkin.github.io/typique-demos/vue-todo-list/
