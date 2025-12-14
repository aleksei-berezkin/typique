import ts from 'typescript/lib/tsserverlibrary'
import type { Identifier, Node, StringLiteral, TemplateLiteral } from 'typescript/lib/tsserverlibrary'

/**
 * findTokenAtPosition is not exposed
 * TODO binary search in both
 */
export function findStringOrTemplateLiteralAtPosition(sourceFile: ts.SourceFile, position: number): StringLiteral | TemplateLiteral | undefined {
  function visit(node: ts.Node): StringLiteral | TemplateLiteral | undefined {
    if (node.getStart() <= position && position < node.getEnd()) {
      return ts.isStringLiteral(node) || ts.isTemplateLiteral(node)
        ? node
        : ts.forEachChild(node, visit)
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
