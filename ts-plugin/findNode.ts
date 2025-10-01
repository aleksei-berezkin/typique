import ts from 'typescript'
import type { Node, StringLiteralLike } from 'typescript'

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

export function findLeafAtEndPositionEndInclusive(sourceFile: ts.SourceFile, position: number): Node | undefined {
  function visit(node: Node): Node | undefined {
    if (node.getStart() <= position && position <= node.getEnd()) {
      return node.getChildCount(sourceFile) === 0 ? node : ts.forEachChild(node, visit)
    }
    return undefined
  }

  return visit(sourceFile)
}
