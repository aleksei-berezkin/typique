import ts from 'typescript'
import type { StringLiteralLike } from 'typescript'

/**
 * findTokenAtPosition is not exposed
 * TODO binary search
 */
export function findStringLiteralLikeAtPosition(sourceFile: ts.SourceFile, position: number): StringLiteralLike | undefined {
  function visit(node: ts.Node): StringLiteralLike | undefined {
    if (node.getStart() <= position && position < node.getEnd()) {
      return ts.isStringLiteralLike(node) ? node : ts.forEachChild(node, visit)
    }
    return undefined
  }

  return visit(sourceFile)
}
