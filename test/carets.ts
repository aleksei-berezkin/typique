import { parseWords } from './parseWords.ts'

type Caret = {
  // 0-based
  line: number
  pos: number
  completionItems: string[]
  operator: '(eq)' | '(includes)' | '(includes-not)'
}

export function* getCarets(content: string): IterableIterator<Caret> {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\/\*(?<items>[\w()!"'`, \.-]*)\|>(?<offset>\d+)?\*\//g)) {
      const items = [...parseWords(m.groups?.items ?? '')]
      const [operator, ...completionItems] = items[0]?.startsWith('(') && items[0]?.endsWith(')')
        ? items
        : ['(eq)', ...items]

      if (operator !== '(eq)' && operator !== '(includes)' && operator !== '(includes-not)')
        throw new Error(`Unknown operator: ${operator} in ${lines[i]}`)

      yield {
        line: i,
        pos: m.index + m[0].length + Number(m.groups?.offset ?? 0),
        completionItems,
        operator,
      }
    }
  }
}
