import { ASTNode } from '../ast';
import type { Diagnostic } from '../diagnostics';
import type { Value } from './values';

export class RuntimeError extends Error {
  public line?: number;
  public column?: number;
  public diagnostic?: Diagnostic;

  constructor(message: string, public node?: ASTNode, location?: { line: number; column: number }) {
    const enhancedMessage = location
      ? `Error at line ${location.line}, column ${location.column}: ${message}`
      : message;

    super(enhancedMessage);
    this.name = 'RuntimeError';

    const resolvedLocation = location ?? node?.location;
    if (resolvedLocation) {
      this.line = resolvedLocation.line;
      this.column = resolvedLocation.column;
      this.diagnostic = {
        level: 'error',
        message,
        span: {
          start: resolvedLocation,
          end: {
            line: resolvedLocation.line,
            column: resolvedLocation.column + 1,
          },
        },
      };
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
