/**
 * Space-separated, maybe quoted
 */
export function* parseWords(input: string): IterableIterator<string> {
  let openQuote = ''
  let escape = false
  let currentWord = ''
  for (const c of input) {
    if (openQuote) {
      if (!escape && c === openQuote) {
        yield currentWord
        currentWord = ''
        openQuote = ''
      } else if (!escape && c === '\\') {
        escape = true
      } else if (escape){
        currentWord += c === 'r' ? '\r'
          : c === 'n' ? '\n'
          : c === 't' ? '\t'
          : c
        escape = false
      } else {
        currentWord += c
      }
    } else {
      if (c === '"' || c === "'" || c === '`') {
        if (currentWord) {
          yield currentWord
          currentWord = ''
        }
        openQuote = c
      } else if (c === ' ') {
        if (currentWord) {
          yield currentWord
          currentWord = ''
        }
      } else {
        currentWord += c
      }
    }
  }

  if (escape)
    throw new Error(`Unterminated escape in ${input}`)
  if (openQuote)
    throw new Error(`Unterminated quote in ${input}`)

  if (currentWord) {
    yield currentWord
  }
}