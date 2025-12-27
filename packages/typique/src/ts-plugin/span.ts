import type TS from 'typescript/lib/tsserverlibrary'
import type { LineAndCharacter, Node, SourceFile, TextSpan } from 'typescript/lib/tsserverlibrary'

export type Span = {
  /** 0-based */
  start: LineAndCharacter
  end: LineAndCharacter
}

export function areSpansEqual(a: Span, b: Span): boolean {
  return a.start.line === b.start.line
    && a.start.character === b.start.character
    && a.end.line === b.end.line
    && a.end.character === b.end.character
}

export function getNodeSpan(ts: typeof TS, node: Node): Span {
  return getSpan(ts, node.getSourceFile(), node.getStart(), node.getEnd())
}

export function getSpan(ts: typeof TS, sourceFile: SourceFile, start: number, end: number): Span {
  return {
    start: ts.getLineAndCharacterOfPosition(sourceFile, start),
    end: ts.getLineAndCharacterOfPosition(sourceFile, end)
  }
}

export function areSpansIntersecting(a: Span, b: Span): boolean {
  return isWithin(a, b.start)
    || isWithin(a, b.end)
    || isWithin(b, a.start)
    || isWithin(b, a.end)
}

function isWithin(span: Span, lineAndCharacter: LineAndCharacter): boolean {
  const {line, character} = lineAndCharacter
  if (line < span.start.line || line > span.end.line) return false
  if (line === span.start.line && character < span.start.character) return false
  if (line === span.end.line && character >= span.end.character) return false
  return true
}

export function toTextSpan(ts: typeof TS, sourceFile: SourceFile, span: Span): TextSpan {
  const start = ts.getPositionOfLineAndCharacter(sourceFile, span.start.line, span.start.character)
  const end = ts.getPositionOfLineAndCharacter(sourceFile, span.end.line, span.end.character)
  return {start, length: end - start}
}

export function getSpanText(ts: typeof TS, sourceFile: SourceFile, span: Span): string {
  const start = ts.getPositionOfLineAndCharacter(sourceFile, span.start.line, span.start.character)
  const end = ts.getPositionOfLineAndCharacter(sourceFile, span.end.line, span.end.character)
  return sourceFile.text.slice(start, end)
}
