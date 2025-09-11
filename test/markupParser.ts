import { errorCodeAndMsg, actionDescriptionAndName } from '../ts-plugin/messages.js'
import { isId, tokenize } from './markupTokenizer.ts'

export type MarkupDiagnostic = {
  code: number
  messageText: string
  links: MarkupLink[]
  fixes: MarkupFix[]
}

type MarkupLink = {
  file: string | undefined
  fragmentIndex: number
}

type MarkupFix = {
  newText: string
  description: string
}

export function* parseMarkup(className: string, markup: string): IterableIterator<MarkupDiagnostic> {
  const tokens = [...tokenize(markup)]
  let current = 0

  function err(msg: string) {
    return new Error(`${msg}; current token: ${tokens[current]} on pos: ${current}; markup: ${markup}`)
  }

  function eof() {
    return current >= tokens.length
  }

  function next(): string | undefined {
    return tokens[current]
  }

  function advance(): string | undefined
  function advance(expected : string | ((token: string) => boolean)): string
  function advance(expected?: string | ((token: string) => boolean)): string | undefined {
    if (expected != null) {
      const expectedPredicate = typeof expected === 'string'
        ? (token: string) => token === expected
        : expected
      const token = next()
      if (token == null || !expectedPredicate(token)) {
        throw err('Unexpected token')
      }
    }
    return tokens[current++]
  }

  function skip(maybe: string) {
    if (next() === maybe)
      advance()
  }

  function* advanceUntil(...tokens: string[]) {
    while (!eof() && !tokens.includes(next()!))
      yield advance()
  }

  function parseDiagnostic(): MarkupDiagnostic {
    const diagName = advance(isId)

    advance('(')

    let msg: string[] | undefined = undefined
    const links: MarkupLink[] = []
    const fixes: MarkupFix[] = []

    while (!eof() && isId(next()!)) {
      const {name, params} = parseDiagAttr()
      if (name === 'msg') {
        msg = params
      } else if (name === 'link') {
        links.push({
          file: params[0] || undefined,
          fragmentIndex: parseInt(params[1]),
        })
      } else if (name === 'fix') {
        fixes.push({
          newText: params[0],
          description: actionDescriptionAndName.change(className, params[0]).description,
        })
      } else {
        throw err(`Unknown attr '${name}'`)
      }
    }

    advance(')')

    if (msg == null) {
      if (diagName === 'duplicate') {
        msg = [className]
      } else if (diagName === 'unused') {
        msg = []
      } else {
        throw err(`Expected 'msg' attr for ${diagName}`)
      }
    } else if (!msg[0]) {
      if (diagName === 'doesNotSatisfy') {
        msg[0] = className
      } else {
        throw err(`msg()[0] is not provided for ${diagName}`)
      }
    }

    const codeAndMsgObjOrFunc = (errorCodeAndMsg as any)[diagName]
    if (!codeAndMsgObjOrFunc)
      err(`Unknown diagnostic '${diagName}'`)

    const codeAndMsg: {code: number, messageText: string} = typeof codeAndMsgObjOrFunc === 'function'
      ? codeAndMsgObjOrFunc(...msg)
      : codeAndMsgObjOrFunc
    return {
      ...codeAndMsg,
      links,
      fixes,
    }
  }

  function parseDiagAttr() {
    const name = advance(isId)
    advance('(')
    const params: string[] = []
    while (!eof() && next() !== ')') {
      params.push([...advanceUntil(',', ')')].join(''))
      skip(',')
    }
    advance(')')
    return {name, params}
  }

  while (!eof()) yield parseDiagnostic()
}
