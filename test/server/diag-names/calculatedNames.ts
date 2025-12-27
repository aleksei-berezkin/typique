import type { Css } from 'typique'

const suffix = '-s'
const cName = /*~~*/`c${suffix}`/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,cName) skipFixes()) duplicate(msg(c-s) alsoDeclared(,1,c-s) skipFixes()) */ satisfies Css<{ color: 'red' }>

const c_sName = /*~~*/'c-s'/*~~ duplicate(alsoDeclared(,0) fix(c-s-name) fix(s-name) fix(c-name) fix(name) fix(s)) */ satisfies Css<{ color: 'blue' }>

console.log(cName, c_sName)
