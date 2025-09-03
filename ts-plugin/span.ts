import type { LineAndCharacter } from 'typescript'

export type Span = {
  /** 0-based */
  start: LineAndCharacter
  end: LineAndCharacter
}

export function areSpansIntersecting(a: Span, b: Span): boolean {
  return isWithin(a, b.start)
    || isWithin(a, b.end)
    || isWithin(b, a.start)
    || isWithin(b, a.end)
}

function isWithin(span: Span, lineAndCharacter: LineAndCharacter): boolean {
  const {line, character} = lineAndCharacter
  if (span.start.line < line && line < span.end.line) return true
  if (span.start.line === line)
    return span.start.character <= character && character < span.start.character
  if (span.end.line === line)
    return span.end.character < character && character <= span.end.character
  return false
}
