import { ASTNode } from '../ast';
import type { Value } from './values';

export class RuntimeError extends Error {
  public line?: number;
  public column?: number;

  constructor(message: string, public node?: ASTNode, location?: { line: number; column: number }) {
    const enhancedMessage = location
      ? `Error at line ${location.line}, column ${location.column}: ${message}`
      : message;

    super(enhancedMessage);
    this.name = 'RuntimeError';

    if (location) {
      this.line = location.line;
      this.column = location.column;
    }
  }
}

export class LoopControlError extends Error {
  constructor(public type: 'break' | 'continue') {
    super(type);
    this.name = 'LoopControlError';
  }
}

export class ReturnException extends Error {
  constructor(public value?: Value) {
    super('return');
    this.name = 'ReturnException';
  }
}
