import type { Css } from 'typique'

const suffix = '-s'
const cName = /*~~*/`c${suffix}`/*~~*/ satisfies Css<{ color: 'red' }> // ~~> calculatedNames.ts:6:22

const cName1 = /*~~*/'c-s'/*~~*/ satisfies Css<{ color: 'blue' }> // ~~> calculatedNames.ts:4:21

console.log(cName, cName1)
