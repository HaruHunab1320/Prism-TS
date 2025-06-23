export type NodeType = 
  | 'Program'
  | 'IdentifierExpression'
  | 'NumberLiteral'
  | 'StringLiteral'
  | 'InterpolatedString'
  | 'BooleanLiteral'
  | 'ArrayLiteral'
  | 'ObjectLiteral'
  | 'PropertyAccess'
  | 'IndexAccess'
  | 'ConfidenceExpression'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'CallExpression'
  | 'TernaryExpression'
  | 'BlockStatement'
  | 'IfStatement'
  | 'UncertainIfStatement'
  | 'ContextStatement'
  | 'AgentDeclaration'
  | 'AssignmentStatement'
  | 'ExpressionStatement';

export abstract class ASTNode {
  abstract type: NodeType;
}

export abstract class Expression extends ASTNode {}
export abstract class Statement extends ASTNode {}

export class IdentifierExpression extends Expression {
  type: NodeType = 'IdentifierExpression';
  
  constructor(public name: string) {
    super();
  }
}

export class NumberLiteral extends Expression {
  type: NodeType = 'NumberLiteral';
  
  constructor(public value: number) {
    super();
  }
}

export class StringLiteral extends Expression {
  type: NodeType = 'StringLiteral';
  
  constructor(public value: string) {
    super();
  }
}

export class InterpolatedString extends Expression {
  type: NodeType = 'InterpolatedString';
  
  constructor(
    public parts: string[],
    public expressions: Expression[]
  ) {
    super();
  }
}

export class BooleanLiteral extends Expression {
  type: NodeType = 'BooleanLiteral';
  
  constructor(public value: boolean) {
    super();
  }
}

export class ConfidenceExpression extends Expression {
  type: NodeType = 'ConfidenceExpression';
  
  constructor(
    public expression: Expression,
    public confidence: Expression
  ) {
    super();
  }
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '&&' | '||' | '~>' | '~~' | '~??' | '~&&' | '~||' | '~||>' | '~@>' | '~+' | '~-' | '~*' | '~/' | '~==' | '~!=' | '~<' | '~>=' | '~<=' | '~.' | '.';

export class BinaryExpression extends Expression {
  type: NodeType = 'BinaryExpression';
  
  constructor(
    public operator: BinaryOperator,
    public left: Expression,
    public right: Expression
  ) {
    super();
  }
}

export type UnaryOperator = '-' | '!' | '~' | '<~';

export class UnaryExpression extends Expression {
  type: NodeType = 'UnaryExpression';
  
  constructor(
    public operator: UnaryOperator,
    public operand: Expression
  ) {
    super();
  }
}

export class CallExpression extends Expression {
  type: NodeType = 'CallExpression';
  
  constructor(
    public callee: Expression,
    public args: Expression[]
  ) {
    super();
  }
  
  get arguments(): Expression[] {
    return this.args;
  }
}

export class TernaryExpression extends Expression {
  type: NodeType = 'TernaryExpression';
  
  constructor(
    public condition: Expression,
    public trueBranch: Expression,
    public falseBranch: Expression
  ) {
    super();
  }
}

export class ArrayLiteral extends Expression {
  type: NodeType = 'ArrayLiteral';
  
  constructor(public elements: Expression[]) {
    super();
  }
}

export class ObjectLiteral extends Expression {
  type: NodeType = 'ObjectLiteral';
  
  constructor(public properties: Array<{ key: string; value: Expression }>) {
    super();
  }
}

export class PropertyAccess extends Expression {
  type: NodeType = 'PropertyAccess';
  
  constructor(
    public object: Expression,
    public property: string
  ) {
    super();
  }
}

export class IndexAccess extends Expression {
  type: NodeType = 'IndexAccess';
  
  constructor(
    public object: Expression,
    public index: Expression
  ) {
    super();
  }
}

export class BlockStatement extends Statement {
  type: NodeType = 'BlockStatement';
  
  constructor(public statements: Statement[]) {
    super();
  }
}

export class IfStatement extends Statement {
  type: NodeType = 'IfStatement';
  
  constructor(
    public condition: Expression,
    public thenStatement: Statement,
    public elseStatement?: Statement
  ) {
    super();
  }
}

export interface UncertainBranches {
  high: Statement;
  medium?: Statement;
  low: Statement;
}

export class UncertainIfStatement extends Statement {
  type: NodeType = 'UncertainIfStatement';
  
  constructor(
    public condition: Expression,
    public threshold: number,
    public branches: UncertainBranches
  ) {
    super();
  }
}

export class ContextStatement extends Statement {
  type: NodeType = 'ContextStatement';
  
  constructor(
    public contextName: string,
    public body: Statement,
    public shiftTo?: string
  ) {
    super();
  }
}

export interface AgentConfig {
  confidence?: number;
  role?: string;
  capabilities?: string[];
}

export class AgentDeclaration extends Statement {
  type: NodeType = 'AgentDeclaration';
  
  constructor(
    public name: string,
    public config: AgentConfig
  ) {
    super();
  }
}

export class AssignmentStatement extends Statement {
  type: NodeType = 'AssignmentStatement';
  
  constructor(
    public identifier: string,
    public value: Expression
  ) {
    super();
  }
}

export class ExpressionStatement extends Statement {
  type: NodeType = 'ExpressionStatement';
  
  constructor(public expression: Expression) {
    super();
  }
}

export class Program extends ASTNode {
  type: NodeType = 'Program';
  
  constructor(public statements: Statement[]) {
    super();
  }
}