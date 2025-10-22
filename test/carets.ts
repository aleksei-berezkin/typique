import { parseWords } from './parseWords.ts'
import type ts from 'typescript'

type Caret = {
  // all 0-based
  caretPos: ts.LineAndCharacter
  replacementSpan?: {
    start: ts.LineAndCharacter
    end: ts.LineAndCharacter
  }
  completionItems: string[]
  operator: '(eq)' | '(includes)' | '(includes-not)'
}

export function* getCarets(content: string): IterableIterator<Caret, undefined, undefined> {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\/\*(?<items>[\w(){}<>!"'`, \.-]*)\|>(?<p0>\d*)(,(?<p1>\d*))?(,(?<p2>\d*))?\*\//g)) {
      const items = [...parseWords(m.groups?.items ?? '')]
      const [operator, ...completionItems] = items[0]?.startsWith('(') && items[0]?.endsWith(')')
        ? items
        : ['(eq)', ...items]

      if (operator !== '(eq)' && operator !== '(includes)' && operator !== '(includes-not)')
        throw new Error(`Unknown operator: ${operator} in ${lines[i]}`)

      const {p0, p1, p2} = m.groups ?? {}

      if (p0 && p1 && p2      // start,caret,end
        || p0 && !p1 && !p2   // caret
        || !p0 && !p1 && !p2  // caret=0
      ) {
        // ok
      } else {
        throw new Error(`Invalid caret: ${m[0]} in ${lines[i]}`)
      }

      function pos(posStr: string | number | undefined) {
        return m.index + m[0].length + Number(posStr)
      }

      yield {
        caretPos: {
          line: i,
          character: pos(p1 ?? p0 ?? 0),
        },
        ...(p0 && p1 && p2 ? {replacementSpan: {
          start: {
            line: i,
            character: pos(p0),
          },
          end: {
            line: i,
            character: pos(p2),
          },
        }} : {}),
        completionItems,
        operator,
      }
    }
  }
}

type MyTestCompletionEntry = {
  name: string
} | {
  name: string
  insertText: string
  replacementSpan: {
    start: ts.LineAndCharacter
    end: ts.LineAndCharacter
  }
}

export function toMyTestCompletionEntries(caret: Caret): MyTestCompletionEntry[] {
  const {replacementSpan} = caret
  return caret.completionItems.map(itemText => {
    return {
      name: getName(itemText),
      ...(replacementSpan ? {
        insertText: itemText,
        replacementSpan,
      } : {}),
    }
  })
}

function getName(insertTextOrName: string) {
  return insertTextOrName.match(/^["'`]([a-zA-Z0-9_-]+)["'`] satisfies/)?.[1] ?? insertTextOrName
}
