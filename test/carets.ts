import { parseWords } from './parseWords.ts'
import type ts from 'typescript'

type Caret = {
  // 0-based
  spanStart?: ts.LineAndCharacter | undefined
  caret: ts.LineAndCharacter
  spanEnd?: ts.LineAndCharacter | undefined
  completionItems: string[]
  operator: '(eq)' | '(includes)' | '(includes-not)'
}

export function* getCarets(content: string): IterableIterator<Caret, undefined, undefined> {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\/\*(?<items>[\w()!"'`, \.-]*)\|>(?<spanStartStr>\d*)(,(?<caretStr>\d*))?(,(?<spanEndStr>\d*))?\*\//g)) {
      const items = [...parseWords(m.groups?.items ?? '')]
      const [operator, ...completionItems] = items[0]?.startsWith('(') && items[0]?.endsWith(')')
        ? items
        : ['(eq)', ...items]

      if (operator !== '(eq)' && operator !== '(includes)' && operator !== '(includes-not)')
        throw new Error(`Unknown operator: ${operator} in ${lines[i]}`)

      const {spanStartStr, caretStr, spanEndStr} = m.groups ?? {}

      function pos(posStr: string | undefined) {
        return m.index + m[0].length + Number(posStr)
      }

      yield {
        ...(spanStartStr ? {spanStart: {
          line: i,
          character: pos(spanStartStr),
        }} : {}),
        caret: {
          line: i,
          character: pos(caretStr ?? 0),
        },
        ...(spanEndStr ? {spanEnd: {
          line: i,
          character: pos(spanEndStr),
        }} : {}),
        completionItems,
        operator,
      }
    }
  }
}

type MyTestCompletion = {
  name: string
  insertText?: string
  replacementSpan?: {
    start: ts.LineAndCharacter
    end: ts.LineAndCharacter
  }
}

export function toMyTestCompletions(caret: Caret): MyTestCompletion[] {
  return caret.completionItems.map(item => {
    const quotedText = getQuotedText(item)
    return {
      name: quotedText ?? item,
      ...(quotedText ? {insertText: item} : {}),
      ...(caret.spanStart && caret.spanEnd ? {replacementSpan: {
        start: caret.spanStart,
        end: caret.spanEnd,
      }} : {}),
    }
  })
}

function getQuotedText(text: string) {
  for (const q of ['"', "'", '`']) {
    const openingQuoteIndex = text.indexOf(q)
    if (openingQuoteIndex > -1) {
      const closingQuoteIndex = text.indexOf(q, openingQuoteIndex + 1)
      if (closingQuoteIndex > -1)
        return text.slice(openingQuoteIndex + 1, closingQuoteIndex)
    }
  }
  return undefined
}
