export type NodeType = 
  | 'Program'
  | 'IdentifierExpression'
  | 'NumberLiteral'
  | 'StringLiteral'
  | 'InterpolatedString'
  | 'BooleanLiteral'
  | 'NullLiteral'
  | 'UndefinedLiteral'
  | 'ArrayLiteral'
  | 'ObjectLiteral'
  | 'PropertyAccess'
  | 'OptionalChainAccess'
  | 'IndexAccess'
  | 'ConfidenceExpression'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'CallExpression'
  | 'TernaryExpression'
  | 'LambdaExpression'
  | 'SpreadElement'
  | 'AssignmentExpression'
  | 'BlockStatement'
  | 'IfStatement'
  | 'UncertainIfStatement'
  | 'ContextStatement'
  | 'AgentDeclaration'
  | 'AssignmentStatement'
  | 'ExpressionStatement'
  | 'ForLoop'
  | 'ForInLoop'
  | 'WhileLoop'
  | 'DoWhileLoop'
  | 'BreakStatement'
  | 'ContinueStatement'
  | 'UncertainForLoop'
  | 'UncertainWhileLoop';

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

export class NullLiteral extends Expression {
  type: NodeType = 'NullLiteral';
  
  constructor() {
    super();
  }
}

export class UndefinedLiteral extends Expression {
  type: NodeType = 'UndefinedLiteral';
  
  constructor() {
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

export type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '**' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '&&' | '||' | '??' | '~>' | '~~' | '~??' | '~&&' | '~||' | '~||>' | '~@>' | '~+' | '~-' | '~*' | '~/' | '~==' | '~!=' | '~<' | '~>=' | '~<=' | '~.' | '.';

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

export class LambdaExpression extends Expression {
  type: NodeType = 'LambdaExpression';
  
  constructor(
    public parameters: string[],
    public body: Expression
  ) {
    super();
  }
}

export class ArrayLiteral extends Expression {
  type: NodeType = 'ArrayLiteral';
  
  constructor(public elements: (Expression | SpreadElement)[]) {
    super();
  }
}

export class ObjectLiteral extends Expression {
  type: NodeType = 'ObjectLiteral';
  
  constructor(public properties: Array<{ key?: string; value: Expression | SpreadElement }>) {
    super();
  }
}

export class SpreadElement extends Expression {
  type: NodeType = 'SpreadElement';
  
  constructor(public argument: Expression) {
    super();
  }
}

export class AssignmentExpression extends Expression {
  type: NodeType = 'AssignmentExpression';
  
  constructor(
    public identifier: string,
    public value: Expression
  ) {
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

export class OptionalChainAccess extends Expression {
  type: NodeType = 'OptionalChainAccess';
  
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

export class ForLoop extends Statement {
  type: NodeType = 'ForLoop';
  
  constructor(
    public init: Statement | null,
    public condition: Expression | null,
    public update: Expression | null,
    public body: Statement
  ) {
    super();
  }
}

export class ForInLoop extends Statement {
  type: NodeType = 'ForInLoop';
  
  constructor(
    public variable: string,
    public index: string | null,  // Optional index variable
    public iterable: Expression,
    public body: Statement
  ) {
    super();
  }
}

export class WhileLoop extends Statement {
  type: NodeType = 'WhileLoop';
  
  constructor(
    public condition: Expression,
    public body: Statement
  ) {
    super();
  }
}

export class DoWhileLoop extends Statement {
  type: NodeType = 'DoWhileLoop';
  
  constructor(
    public body: Statement,
    public condition: Expression
  ) {
    super();
  }
}

export class BreakStatement extends Statement {
  type: NodeType = 'BreakStatement';
  
  constructor() {
    super();
  }
}

export class ContinueStatement extends Statement {
  type: NodeType = 'ContinueStatement';
  
  constructor() {
    super();
  }
}

export class UncertainForLoop extends Statement {
  type: NodeType = 'UncertainForLoop';
  
  constructor(
    public init: Statement | null,
    public condition: Expression | null,
    public update: Expression | null,
    public branches: UncertainBranches
  ) {
    super();
  }
}

export class UncertainWhileLoop extends Statement {
  type: NodeType = 'UncertainWhileLoop';
  
  constructor(
    public condition: Expression,
    public branches: UncertainBranches
  ) {
    super();
  }
}

export class Program extends ASTNode {
  type: NodeType = 'Program';
  
  constructor(public statements: Statement[]) {
    super();
  }
}