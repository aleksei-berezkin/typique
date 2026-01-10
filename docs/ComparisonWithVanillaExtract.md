# Comparison of Typique and Vanilla Extract

Typique belongs to the family of zero-runtime, multi-framework CSS-in-TS libraries, and its closest relative is [Vanilla Extract](https://vanilla-extract.style/).

Below is a detailed comparison of the two.

| Criterion | Typique | Vanilla Extract |
| --------- | ------- | --------------- |
| Languages | TypeScript only | TypeScript and JavaScript |
| Where it works | In any bundler | In a subset of supported bundlers |
| React Server Components | Compatible by design | May require extra steps and workarounds |
| Alignment | Aligned very tightly with TS compiler, language service and project model | Aligned with bundlers pipeline |
| Resilience | Stable against build pipelines; might be potentially affected by invasive (officially discouraged) TS plugins | Stable against TS tooling; fragile against any changes in bundlers and frameworks |
| How styles are written | As types | As objects |
| Colocation | Anywhere | Unsupported |
| Names | Visible from source, customizable, TS-project scoped | Derived from names in source, always hashed, project-unaware |
| CSS features usage | Doesn't require any additional API for selectors, globals etc. | Requires additional syntax for selectors and globals |
| Dependence on IDE and tooling | Strong: requires IDE to properly support TS language service | Weak: only required for completion and validation |
| Output | Emits plain CSS file(s); allows per-file CSS output; mechanics similar to Tailwind | Output is controlled by a bundler; standard pipeline CSS mechanics |
| Opting out | Easy: names already exist in the source; remove the types and commit the generated CSS | Harder: requires manually reconnecting class names with the generated CSS |
