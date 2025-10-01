import ts from 'typescript'
import type { Identifier, Node, StringLiteralLike } from 'typescript'

/**
 * findTokenAtPosition is not exposed
 * TODO binary search in both
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

export function findIdentifierAtPosition(sourceFile: ts.SourceFile, position: number, positionInsideIdentifier: 'anywhere' | 'end'): Identifier | undefined {
  function visit(node: Node): Identifier | undefined {
    if (node.getStart() <= position && position <= node.getEnd()) {
      return ts.isIdentifier(node) && (positionInsideIdentifier === 'anywhere' || node.getEnd() === position)
        ? node
        : ts.forEachChild(node, visit)
    }
    return undefined
  }

  return visit(sourceFile)
}
