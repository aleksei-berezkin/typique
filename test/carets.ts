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
    for (const m of lines[i].matchAll(/\/\*(?<items>[\w(){}<>!"'`, \.-]*)\|>(?<spanStartStr>\d*)(,(?<caretStr>\d*))?(,(?<spanEndStr>\d*))?\*\//g)) {
      const items = [...parseWords(m.groups?.items ?? '')]
      const [operator, ...completionItems] = items[0]?.startsWith('(') && items[0]?.endsWith(')')
        ? items
        : ['(eq)', ...items]

      if (operator !== '(eq)' && operator !== '(includes)' && operator !== '(includes-not)')
        throw new Error(`Unknown operator: ${operator} in ${lines[i]}`)

      const {spanStartStr, caretStr, spanEndStr} = m.groups ?? {}

      function pos(posStr: string | number | undefined) {
        return m.index + m[0].length + Number(posStr)
      }

      yield {
        caretPos: {
          line: i,
          character: pos(caretStr ?? 0),
        },
        ...(spanStartStr && spanEndStr ? {replacementSpan: {
          start: {
            line: i,
            character: pos(spanStartStr),
          },
          end: {
            line: i,
            character: pos(spanEndStr),
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
