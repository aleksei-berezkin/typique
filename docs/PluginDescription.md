# How the Typique TypeScript plugin works

The plugin is written according to the [official guidelines](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin).

What the plugin is doing:

- ✅ Adds custom completion items for classnames, css vars names and CSS properties
- ✅ Adds custom diagnostics if the name contains issues
- ✅ Asynchronously writes the CSS file — `./typique-output.css` by [default](./Configuration.md)
- ✅ Writes to the TS Server log (if enabled) with the prefix `TypiquePlugin::`

What it doesn't do:

- ❌ Doesn't write to your file system anything else
- ❌ Doesn't touch your source files, compiled JS / `.d.ts` files, or generated sourcemaps
- ❌ Doesn't modify or remove any other completion and diagnostics provided by TypeScript or other plugins
- ❌ Doesn't alter how types are inferred or how references are resolved
- ❌ Doesn't use private TS internals
- ❌ The plugin is not loaded during the compilation with the `tsc` command

## The plugin workflow

The typical workflow looks like this:

- On project loading, Typique scans all project files (which aren't [disabled](./Configuration.md#include-exclude)), and outputs the CSS file
- On file change, Typique *only* scans the changed file, and outputs the updated CSS file
- On completion or diagnostics request from the editor, Typique uses the existing state data, evaluated during the last CSS output, to provide the results

## Performance

Normally, the plugin only needs the data which is anyway evaluated by TypeScript, which means it doesn't noticeably affect the DX performance. However, the plugin startup may take longer in large codebases. During editing, Typique only re-evaluates changed files, which is typically fast even for very large projects and files.

If you suspect performance issues, open the TS Server log and check records prefixed with `TypiquePlugin::`. All records include the elapsed time.

If you encounter performance problems, consider:

- Limiting scanned files with the plugin’s `include` and `exclude` settings
- Splitting large files with multiple styles invocations into smaller ones
- Splitting large projects into smaller ones (see also [Sharindg a Subproject Within a Workspace](./MonoreposAndSharedCode.md#sharing-a-subproject-within-a-workspace) guide)

## CLI tools

Because `tsc` doesn't load plugins, the Typique CLI command (`npx typique --build`) work by starting the `tsserver.js` and executing the custom commands on it — similar to how it's done by the editor.

## Package layout

The package contains the following parts:

- `./` — only exports `Css` and `Var` types, to make sure you won't have anything in runtime, even if your write `import {Css} from 'typique'`, and not `import type {Css} from 'typique'`.
- `./ts-plugin` — the TypeScript plugin
- `./util` — the utility functions to concatenate the classnames
