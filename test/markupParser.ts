import { errorCodeAndMsg, actionDescriptionAndName } from '../ts-plugin/messages.js'
import { isId, tokenize } from './markupTokenizer.ts'

export type MarkupDiagnostic = {
  code: number
  messageText: string
  related: MarkupRelated[]
  fixes: MarkupFix[]
}

type MarkupRelated = {
  code: number
  messageText: string
  file: string | undefined
  diagnosticIndex: number
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
    const related: MarkupRelated[] = []
    const fixes: MarkupFix[] = []

    while (!eof() && isId(next()!)) {
      const {name, params} = parseDiagAttr()
      if (name === 'msg') {
        msg = params
      } else if (name === 'fix') {
        fixes.push({
          newText: params[0],
          description: actionDescriptionAndName.change(className, params[0]).description,
        })
      } else if (name in errorCodeAndMsg) {
        const [file, diagnosticIndex, ...msgParams] = params
        const effectiveParams = msgParams.length === 0 ? [className] : msgParams
        related.push({
          ...codeAndMsg(name, effectiveParams),
          file: file || undefined,
          diagnosticIndex: diagnosticIndex ? parseInt(diagnosticIndex) : 0,
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
      } else if (diagName === 'doesNotSatisfy') {
        msg = [className, '${contextName}']
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

    return {
      ...codeAndMsg(diagName, msg),
      related: related,
      fixes,
    }
  }

  function codeAndMsg(key: string, args: string[]) {
    const codeAndMsgObjOrFunc = (errorCodeAndMsg as any)[key]
    if (!codeAndMsgObjOrFunc)
      err(`Unknown diagnostic '${key}'`)

    const codeAndMsg: {code: number, messageText: string} = typeof codeAndMsgObjOrFunc === 'function'
      ? codeAndMsgObjOrFunc(...args)
      : codeAndMsgObjOrFunc

    return codeAndMsg
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
