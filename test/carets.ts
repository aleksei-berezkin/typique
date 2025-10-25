import { getComments } from './getComments.ts'
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
  operator: '(eq)' | '(first-eq)' | '(includes)' | '(includes-not)'
}

export function* getCarets(lines: string[]): IterableIterator<Caret, undefined, undefined> {
  for (const {end, innerText} of getComments(lines)) {
    if (innerText.includes('|>')) {
      const [itemsStr, positionsStr] = innerText.split('|>')

      const items = [...parseWords(itemsStr)]
      const [operator, ...completionItems] = items[0]?.startsWith('(') && items[0]?.endsWith(')')
        ? items
        : ['(eq)', ...items]
      if (operator !== '(eq)' && operator !== '(first-eq)' && operator !== '(includes)' && operator !== '(includes-not)')
        throw new Error(`Unknown operator: ${operator} in ${innerText}`)

      const m = positionsStr.match(/(?<p0>\d*)(,(?<p1>\d*))?(,(?<p2>\d*))?/)

      const {p0, p1, p2} = m?.groups ?? {}

      if (p0 && p1 && p2      // start,caret,end
        || p0 && !p1 && !p2   // caret
        || !p0 && !p1 && !p2  // caret=0
      ) {
        // ok
      } else {
        throw new Error(`Invalid caret: ${innerText} in ${lines[end.line]}`)
      }

      function pos(posStr: string | number | undefined) {
        return end.character + Number(posStr)
      }

      const {line} = end
      yield {
        caretPos: {
          line,
          character: pos(p1 ?? p0 ?? 0),
        },
        ...(p0 && p1 && p2 ? {replacementSpan: {
          start: {
            line,
            character: pos(p0),
          },
          end: {
            line,
            character: pos(p2),
          },
        }} : {}),
        completionItems,
        operator,
      }
    }
  }
}

export type MyTestCompletionEntry = {
  name: string
  insertText?: string
  replacementSpan?: {
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
