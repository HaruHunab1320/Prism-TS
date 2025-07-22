import { ASTNode } from '@prism-lang/core';

export function getNodeLocation(node: ASTNode): { line: number; column: number } {
  return node.location || { line: 1, column: 1 };
}

export function getLine(node: ASTNode): number {
  return node.location?.line || 1;
}

export function getColumn(node: ASTNode): number {
  return node.location?.column || 1;
}