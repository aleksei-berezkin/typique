import type {Var} from 'typique'

const themeVars = {
  bg: {
    light: '--theme-bg-light',
    dark: /*~~*/'--theme-bg-night'/*~~ doesNotSatisfy(msg(,--${contextName}) contextNameEvaluatedTo(,,theme/bg/dark) fix(--theme-bg-dark) fix(--theme-dark) fix(--theme-bg) fix(--theme) fix(--dark)) */,
  },
  fg: {
    primary: /*~~*/'--theme-fg-pr'/*~~ duplicate(alsoDeclared(,2) fix(--theme-fg-primary) fix(--theme-primary) fix(--fg-primary) fix(--primary) fix(--theme)) */,
    preformatted: /*~~*/'--theme-fg-pr'/*~~ duplicate(alsoDeclared(,1) fix(--theme-fg-preformatted) fix(--theme-preformatted) fix(--fg-preformatted) fix(--preformatted) fix(--theme)) */,
  }
} satisfies Var

console.log(themeVars)
