import type {Var} from 'typique'

const themeVars = {
  bg: {
    light: '--theme-bg-light',
    dark: /*~~*/'--theme-bg-night'/*~~ doesNotSatisfy(msg(,--${contextName}) contextNameEvaluatedTo(,,theme/bg/dark) fix(--theme-bg-dark) fix(--bg-dark) fix(--dark)) */,
  },
  fg: {
    primary: /*~~*/'--theme-fg-pr'/*~~ duplicate(alsoDeclared(,2) fix(--theme-fg-primary) fix(--fg-primary) fix(--primary)) */,
    preformatted: /*~~*/'--theme-fg-pr'/*~~ duplicate(alsoDeclared(,1) fix(--theme-fg-preformatted) fix(--fg-preformatted) fix(--preformatted)) */,
  }
} satisfies Var

console.log(themeVars)
