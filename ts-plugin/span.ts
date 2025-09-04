import type { LineAndCharacter, Node, SourceFile, TextSpan } from 'typescript'
import ts from 'typescript'

export type Span = {
  /** 0-based */
  start: LineAndCharacter
  end: LineAndCharacter
}

export function getNodeSpan(node: Node): Span {
  return getSpan(node.getSourceFile(), node.getStart(), node.getEnd())
}

export function getSpan(sourceFile: SourceFile, start: number, end: number): Span {
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
  if (span.start.line < line && line < span.end.line) return true
  if (span.start.line === line)
    return span.start.character <= character
  if (span.end.line === line)
    return character < span.end.character
  return false
}

export function toTextSpan(sourceFile: SourceFile, span: Span): TextSpan {
  const start = ts.getPositionOfLineAndCharacter(sourceFile, span.start.line, span.start.character)
  const end = ts.getPositionOfLineAndCharacter(sourceFile, span.end.line, span.end.character)
  return {start, length: end - start}
}
