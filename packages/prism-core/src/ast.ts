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
  | 'ConfidentTernaryExpression'
  | 'LambdaExpression'
  | 'SpreadElement'
  | 'PlaceholderExpression'
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
  | 'UncertainWhileLoop'
  | 'ArrayPattern'
  | 'ObjectPattern'
  | 'RestElement'
  | 'DestructuringAssignment'
  | 'ImportStatement'
  | 'ExportStatement'
  | 'ImportSpecifier'
  | 'ExportSpecifier'
  | 'FunctionDeclaration'
  | 'ReturnStatement'
  | 'VariableDeclaration'
  | 'AwaitExpression';

export abstract class ASTNode {
  abstract type: NodeType;
  location?: { line: number; column: number };
  
  setLocation(line: number, column: number): this {
    this.location = { line, column };
    return this;
  }
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

export type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '**' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '===' | '!==' | '&&' | '||' | '??' | '|>' | '~>' | '~~' | '~??' | '~&&' | '~||' | '~||>' | '~@>' | '~|>' | '~?>' | '~+' | '~-' | '~*' | '~/' | '~==' | '~!=' | '~<' | '~>=' | '~<=' | '~.' | '.' | 'instanceof';

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

export type UnaryOperator = '-' | '!' | '~' | '<~' | 'typeof';

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
    public args: (Expression | SpreadElement)[]
  ) {
    super();
  }
  
  get arguments(): (Expression | SpreadElement)[] {
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

export class ConfidentTernaryExpression extends Expression {
  type: NodeType = 'ConfidentTernaryExpression';
  
  constructor(
    public condition: Expression,
    public trueBranch: Expression,
    public falseBranch: Expression
  ) {
    super();
  }
}

export type LambdaParameter = string | ArrayPattern | ObjectPattern;

export class LambdaExpression extends Expression {
  type: NodeType = 'LambdaExpression';
  
  constructor(
    public parameters: LambdaParameter[],
    public body: Expression | BlockStatement,
    public restParameter?: string | ArrayPattern | ObjectPattern
  ) {
    super();
  }
}

export class ArrayLiteral extends Expression {
  type: NodeType = 'ArrayLiteral';
  
  constructor(public elements: (Expression | SpreadElement | null)[]) {
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

export class PlaceholderExpression extends Expression {
  type: NodeType = 'PlaceholderExpression';
  
  constructor() {
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

export class AwaitExpression extends Expression {
  type: NodeType = 'AwaitExpression';
  
  constructor(
    public expression: Expression
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
  high?: Statement;
  medium?: Statement;
  low?: Statement;
  default?: Statement;
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

// Pattern nodes for destructuring
export class ArrayPattern extends Expression {
  type: NodeType = 'ArrayPattern';
  
  constructor(
    public elements: (IdentifierExpression | ArrayPattern | ObjectPattern | RestElement | null)[],
    public elementThresholds?: (Expression | null)[]  // Per-element thresholds (Option 3)
  ) {
    super();
  }
}

export class ObjectPattern extends Expression {
  type: NodeType = 'ObjectPattern';
  
  constructor(
    public properties: Array<{
      key: string;
      value: IdentifierExpression | ArrayPattern | ObjectPattern;
      defaultValue?: Expression;
      confidenceThreshold?: Expression;  // Per-property threshold (Option 3)
    }>,
    public rest?: RestElement
  ) {
    super();
  }
}

export class RestElement extends Expression {
  type: NodeType = 'RestElement';
  
  constructor(
    public argument: IdentifierExpression
  ) {
    super();
  }
}

export class DestructuringAssignment extends Statement {
  type: NodeType = 'DestructuringAssignment';
  
  constructor(
    public pattern: ArrayPattern | ObjectPattern,
    public value: Expression,
    public confidenceThreshold?: Expression  // For global threshold (Option 1)
  ) {
    super();
  }
}

// Import/Export system
export class ImportSpecifier extends ASTNode {
  type: NodeType = 'ImportSpecifier';
  
  constructor(
    public imported: string,  // Name in the module
    public local?: string     // Local name (for "as" renaming)
  ) {
    super();
  }
}

export class ExportSpecifier extends ASTNode {
  type: NodeType = 'ExportSpecifier';
  
  constructor(
    public local: string,     // Local name
    public exported?: string  // Exported name (for "as" renaming)
  ) {
    super();
  }
}

export class ImportStatement extends Statement {
  type: NodeType = 'ImportStatement';
  
  constructor(
    public specifiers: ImportSpecifier[],  // Named imports
    public source: string,                 // Module path
    public defaultImport?: string,         // Default import name
    public namespaceImport?: string        // Namespace import name (import * as)
  ) {
    super();
  }
}

export class ExportStatement extends Statement {
  type: NodeType = 'ExportStatement';
  
  constructor(
    public specifiers?: ExportSpecifier[],  // Named exports
    public source?: string,                 // Re-export source
    public declaration?: Statement,         // Direct export declaration
    public isDefault?: boolean,             // export default
    public isNamespace?: boolean            // export *
  ) {
    super();
  }
}

// Function Declaration and Return Statement
export class FunctionDeclaration extends Statement {
  type: NodeType = 'FunctionDeclaration';
  
  constructor(
    public name: string,                           // Function name
    public parameters: LambdaParameter[],          // Parameter list (reuse lambda parameter types)
    public body: BlockStatement,                   // Function body (must be block)
    public restParameter?: string | ArrayPattern | ObjectPattern,  // Rest parameter
    public confidenceAnnotation?: Expression,      // Optional confidence annotation: function name() ~> 0.8
    public isAsync: boolean = false               // Whether the function is async
  ) {
    super();
  }
}

export class ReturnStatement extends Statement {
  type: NodeType = 'ReturnStatement';
  
  constructor(
    public value?: Expression  // Optional return value
  ) {
    super();
  }
}

// Variable Declaration with const/let support
export class VariableDeclaration extends Statement {
  type: NodeType = 'VariableDeclaration';
  
  constructor(
    public kind: 'const' | 'let',           // Variable declaration kind
    public identifier: string,              // Variable name
    public initializer?: Expression,        // Optional initial value
    public pattern?: ArrayPattern | ObjectPattern  // Optional destructuring pattern
  ) {
    super();
  }
}