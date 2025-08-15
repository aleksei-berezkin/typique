import type { Css } from 'laim'

// TODO multiple on the same line
const cName = /*~~*/(() => 'c' as const)()/*~~*/ satisfies Css<{ color: 'red' }> // ~~> calculatedNames.ts:6:22

const cName1 = /*~~*/'c'/*~~*/ satisfies Css<{ color: 'blue' }> // ~~> calculatedNames.ts:4:21

console.log(cName, cName1)
