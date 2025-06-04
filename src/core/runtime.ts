import {
  ASTNode,
  Program,
  IdentifierExpression,
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  ConfidenceExpression,
  AssignmentStatement,
  IfStatement,
  UncertainIfStatement,
  ContextStatement,
  AgentDeclaration,
  BlockStatement,
  ExpressionStatement,
  BinaryOperator,
} from './ast';
import { ConfidenceValue as ConfidenceLib, ConfidenceLevel } from '../confidence';
import { Context, ContextManager } from '../context';
import { LLMProvider, LLMRequest, MockLLMProvider } from '../llm';

export class RuntimeError extends Error {
  constructor(message: string, public node?: ASTNode) {
    super(message);
    this.name = 'RuntimeError';
  }
}

export abstract class Value {
  abstract type: string;
  abstract value: unknown;
  abstract equals(other: Value): boolean;
  abstract isTruthy(): boolean;
  abstract toString(): string;
}

export class NumberValue extends Value {
  type = 'number';

  constructor(public value: number) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof NumberValue && other.value === this.value;
  }

  isTruthy(): boolean {
    return this.value !== 0;
  }

  toString(): string {
    return this.value.toString();
  }
}

export class StringValue extends Value {
  type = 'string';

  constructor(public value: string) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof StringValue && other.value === this.value;
  }

  isTruthy(): boolean {
    return this.value.length > 0;
  }

  toString(): string {
    return this.value;
  }
}

export class BooleanValue extends Value {
  type = 'boolean';

  constructor(public value: boolean) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof BooleanValue && other.value === this.value;
  }

  isTruthy(): boolean {
    return this.value;
  }

  toString(): string {
    return this.value.toString();
  }
}

export class ConfidenceValue extends Value {
  type = 'confident';

  constructor(
    public value: Value,
    public confidence: ConfidenceLib
  ) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof ConfidenceValue && 
           other.value.equals(this.value) &&
           other.confidence.equals(this.confidence);
  }

  isTruthy(): boolean {
    return this.value.isTruthy();
  }

  toString(): string {
    return `${this.value.toString()} (~${this.confidence.toString()})`;
  }
}

export class FunctionValue extends Value {
  type = 'function';

  constructor(
    public name: string,
    public value: (args: Value[]) => Promise<Value>
  ) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof FunctionValue && other.name === this.name;
  }

  isTruthy(): boolean {
    return true;
  }

  toString(): string {
    return `[Function: ${this.name}]`;
  }
}

export class Environment {
  private variables = new Map<string, Value>();

  constructor(private parent?: Environment) {}

  define(name: string, value: Value): void {
    this.variables.set(name, value);
  }

  get(name: string): Value {
    if (this.variables.has(name)) {
      return this.variables.get(name)!;
    }

    if (this.parent) {
      return this.parent.get(name);
    }

    throw new RuntimeError(`Undefined variable: ${name}`);
  }

  set(name: string, value: Value): void {
    if (this.variables.has(name)) {
      this.variables.set(name, value);
      return;
    }

    if (this.parent) {
      try {
        this.parent.get(name); // Check if exists in parent
        this.parent.set(name, value);
        return;
      } catch {
        // Variable doesn't exist in parent, create in current scope
      }
    }

    this.variables.set(name, value);
  }
}

export class Interpreter {
  private environment: Environment;
  private contextManager: ContextManager;
  private llmProviders = new Map<string, LLMProvider>();
  private defaultLLMProvider?: string;

  constructor() {
    this.environment = new Environment();
    this.contextManager = new ContextManager();
    this.setupBuiltins();
  }

  private setupBuiltins(): void {
    // Add built-in functions
    this.environment.define('llm', new FunctionValue('llm', async (args) => {
      if (args.length === 0) {
        throw new RuntimeError('llm() requires at least one argument');
      }

      const promptValue = args[0];
      if (!(promptValue instanceof StringValue)) {
        throw new RuntimeError('llm() first argument must be a string');
      }

      const provider = this.getDefaultLLMProvider();
      if (!provider) {
        throw new RuntimeError('No LLM provider configured');
      }

      try {
        const request = new LLMRequest(promptValue.value);
        const response = await provider.complete(request);
        
        return new ConfidenceValue(
          new StringValue(response.content),
          response.confidence
        );
      } catch (error) {
        throw new RuntimeError(`LLM call failed: ${(error as Error).message}`);
      }
    }));
  }

  registerLLMProvider(name: string, provider: LLMProvider): void {
    this.llmProviders.set(name, provider);
  }

  setDefaultLLMProvider(name: string): void {
    if (!this.llmProviders.has(name)) {
      throw new RuntimeError(`LLM provider '${name}' not found`);
    }
    this.defaultLLMProvider = name;
  }

  getDefaultLLMProviderName(): string | undefined {
    return this.defaultLLMProvider;
  }

  private getDefaultLLMProvider(): LLMProvider | undefined {
    if (!this.defaultLLMProvider) {
      return undefined;
    }
    return this.llmProviders.get(this.defaultLLMProvider);
  }

  async interpret(node: ASTNode): Promise<Value> {
    switch (node.type) {
      case 'Program':
        return this.interpretProgram(node as Program);
      case 'NumberLiteral':
        return this.interpretNumberLiteral(node as NumberLiteral);
      case 'StringLiteral':
        return this.interpretStringLiteral(node as StringLiteral);
      case 'BooleanLiteral':
        return this.interpretBooleanLiteral(node as BooleanLiteral);
      case 'IdentifierExpression':
        return this.interpretIdentifier(node as IdentifierExpression);
      case 'BinaryExpression':
        return this.interpretBinaryExpression(node as BinaryExpression);
      case 'UnaryExpression':
        return this.interpretUnaryExpression(node as UnaryExpression);
      case 'CallExpression':
        return this.interpretCallExpression(node as CallExpression);
      case 'ConfidenceExpression':
        return this.interpretConfidenceExpression(node as ConfidenceExpression);
      case 'AssignmentStatement':
        return this.interpretAssignmentStatement(node as AssignmentStatement);
      case 'IfStatement':
        return this.interpretIfStatement(node as IfStatement);
      case 'UncertainIfStatement':
        return this.interpretUncertainIfStatement(node as UncertainIfStatement);
      case 'ContextStatement':
        return this.interpretContextStatement(node as ContextStatement);
      case 'AgentDeclaration':
        return this.interpretAgentDeclaration(node as AgentDeclaration);
      case 'BlockStatement':
        return this.interpretBlockStatement(node as BlockStatement);
      case 'ExpressionStatement':
        return this.interpretExpressionStatement(node as ExpressionStatement);
      default:
        throw new RuntimeError(`Unknown node type: ${(node as any).type}`, node);
    }
  }

  private async interpretProgram(program: Program): Promise<Value> {
    let result: Value = new NumberValue(0); // Default return value

    for (const statement of program.statements) {
      result = await this.interpret(statement);
    }

    return result;
  }

  private async interpretNumberLiteral(node: NumberLiteral): Promise<Value> {
    return new NumberValue(node.value);
  }

  private async interpretStringLiteral(node: StringLiteral): Promise<Value> {
    return new StringValue(node.value);
  }

  private async interpretBooleanLiteral(node: BooleanLiteral): Promise<Value> {
    return new BooleanValue(node.value);
  }

  private async interpretIdentifier(node: IdentifierExpression): Promise<Value> {
    try {
      return this.environment.get(node.name);
    } catch (error) {
      throw new RuntimeError(`Undefined variable: ${node.name}`, node);
    }
  }

  private async interpretBinaryExpression(node: BinaryExpression): Promise<Value> {
    const left = await this.interpret(node.left);
    const right = await this.interpret(node.right);

    return this.applyBinaryOperator(node.operator, left, right, node);
  }

  private applyBinaryOperator(
    operator: BinaryOperator,
    left: Value,
    right: Value,
    node: BinaryExpression
  ): Value {
    // Handle confidence propagation
    if (left instanceof ConfidenceValue || right instanceof ConfidenceValue) {
      return this.applyBinaryOperatorWithConfidence(operator, left, right, node);
    }

    switch (operator) {
      case '+':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          return new NumberValue(left.value + right.value);
        }
        if (left instanceof StringValue || right instanceof StringValue) {
          return new StringValue(left.toString() + right.toString());
        }
        throw new RuntimeError(`Cannot apply + to ${left.type} and ${right.type}`, node);

      case '-':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          return new NumberValue(left.value - right.value);
        }
        throw new RuntimeError(`Cannot apply - to ${left.type} and ${right.type}`, node);

      case '*':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          return new NumberValue(left.value * right.value);
        }
        throw new RuntimeError(`Cannot apply * to ${left.type} and ${right.type}`, node);

      case '/':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          if (right.value === 0) {
            throw new RuntimeError('Division by zero', node);
          }
          return new NumberValue(left.value / right.value);
        }
        throw new RuntimeError(`Cannot apply / to ${left.type} and ${right.type}`, node);

      case '>':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          return new BooleanValue(left.value > right.value);
        }
        throw new RuntimeError(`Cannot compare ${left.type} and ${right.type}`, node);

      case '<':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          return new BooleanValue(left.value < right.value);
        }
        throw new RuntimeError(`Cannot compare ${left.type} and ${right.type}`, node);

      case '>=':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          return new BooleanValue(left.value >= right.value);
        }
        throw new RuntimeError(`Cannot compare ${left.type} and ${right.type}`, node);

      case '<=':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          return new BooleanValue(left.value <= right.value);
        }
        throw new RuntimeError(`Cannot compare ${left.type} and ${right.type}`, node);

      case '==':
        return new BooleanValue(left.equals(right));

      case '!=':
        return new BooleanValue(!left.equals(right));

      case '&&':
        return new BooleanValue(left.isTruthy() && right.isTruthy());

      case '||':
        return new BooleanValue(left.isTruthy() || right.isTruthy());

      case '.':
        // Property access - simplified implementation
        return right;

      default:
        throw new RuntimeError(`Unknown binary operator: ${operator}`, node);
    }
  }

  private applyBinaryOperatorWithConfidence(
    operator: BinaryOperator,
    left: Value,
    right: Value,
    node: BinaryExpression
  ): Value {
    // Extract values and confidences
    const leftValue = left instanceof ConfidenceValue ? left.value : left;
    const rightValue = right instanceof ConfidenceValue ? right.value : right;
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    const rightConf = right instanceof ConfidenceValue ? right.confidence : new ConfidenceLib(1.0);

    // Apply operation to underlying values
    const result = this.applyBinaryOperator(operator, leftValue, rightValue, node);

    // Combine confidences (use minimum for most operations)
    const combinedConfidence = leftConf.min ? leftConf.min(rightConf) : leftConf;

    return new ConfidenceValue(result, combinedConfidence);
  }

  private async interpretUnaryExpression(node: UnaryExpression): Promise<Value> {
    const operand = await this.interpret(node.operand);

    switch (node.operator) {
      case '-':
        if (operand instanceof NumberValue) {
          return new NumberValue(-operand.value);
        }
        throw new RuntimeError(`Cannot apply unary - to ${operand.type}`, node);

      case '!':
        return new BooleanValue(!operand.isTruthy());

      case '~':
        // Bitwise NOT - for now, just return the operand
        return operand;

      default:
        throw new RuntimeError(`Unknown unary operator: ${node.operator}`, node);
    }
  }

  private async interpretCallExpression(node: CallExpression): Promise<Value> {
    const callee = await this.interpret(node.callee);

    if (!(callee instanceof FunctionValue)) {
      throw new RuntimeError(`Cannot call non-function value: ${callee.type}`, node);
    }

    const args: Value[] = [];
    for (const arg of node.args) {
      args.push(await this.interpret(arg));
    }

    return await callee.value(args);
  }

  private async interpretConfidenceExpression(node: ConfidenceExpression): Promise<Value> {
    const expression = await this.interpret(node.expression);
    const confidence = new ConfidenceLib(node.confidence);
    
    return new ConfidenceValue(expression, confidence);
  }

  private async interpretAssignmentStatement(node: AssignmentStatement): Promise<Value> {
    const value = await this.interpret(node.value);
    this.environment.set(node.identifier, value);
    return value;
  }

  private async interpretIfStatement(node: IfStatement): Promise<Value> {
    const condition = await this.interpret(node.condition);

    if (condition.isTruthy()) {
      return await this.interpret(node.thenStatement);
    } else if (node.elseStatement) {
      return await this.interpret(node.elseStatement);
    }

    return new NumberValue(0); // Default return
  }

  private async interpretUncertainIfStatement(node: UncertainIfStatement): Promise<Value> {
    const condition = await this.interpret(node.condition);
    
    let confidence: ConfidenceLib;
    if (condition instanceof ConfidenceValue) {
      confidence = condition.confidence;
    } else {
      throw new RuntimeError('Uncertain if requires a confidence expression', node);
    }

    // Determine which branch to execute based on confidence level
    const level = confidence.level;
    
    if (level === ConfidenceLevel.HIGH && node.branches.high) {
      return await this.interpret(node.branches.high);
    } else if (level === ConfidenceLevel.MEDIUM && node.branches.medium) {
      return await this.interpret(node.branches.medium);
    } else if (node.branches.low) {
      return await this.interpret(node.branches.low);
    }

    return new NumberValue(0); // Default return
  }

  private async interpretContextStatement(node: ContextStatement): Promise<Value> {
    // Create and enter context
    const context = new Context(node.contextName);
    this.contextManager.registerContext(context);
    this.contextManager.enterContext(node.contextName);

    try {
      const result = await this.interpret(node.body);
      
      // Handle context shifting
      if (node.shiftTo) {
        this.contextManager.switchContext(node.shiftTo);
      }
      
      return result;
    } finally {
      this.contextManager.exitContext();
    }
  }

  private async interpretAgentDeclaration(node: AgentDeclaration): Promise<Value> {
    // For now, just return a placeholder value
    // In a full implementation, this would register the agent
    return new StringValue(`Agent: ${node.name}`);
  }

  private async interpretBlockStatement(node: BlockStatement): Promise<Value> {
    // Create new scope
    const previousEnv = this.environment;
    this.environment = new Environment(previousEnv);

    try {
      let result: Value = new NumberValue(0);
      
      for (const statement of node.statements) {
        result = await this.interpret(statement);
      }
      
      return result;
    } finally {
      // Restore previous scope
      this.environment = previousEnv;
    }
  }

  private async interpretExpressionStatement(node: ExpressionStatement): Promise<Value> {
    return await this.interpret(node.expression);
  }
}

export class Runtime {
  private interpreter: Interpreter;

  constructor() {
    this.interpreter = new Interpreter();
  }

  async execute(program: Program): Promise<Value> {
    return await this.interpreter.interpret(program);
  }

  registerLLMProvider(name: string, provider: LLMProvider): void {
    this.interpreter.registerLLMProvider(name, provider);
  }

  setDefaultLLMProvider(name: string): void {
    this.interpreter.setDefaultLLMProvider(name);
  }

  getDefaultLLMProvider(): string | undefined {
    return this.interpreter.getDefaultLLMProviderName();
  }
}

export function createRuntime(): Runtime {
  const runtime = new Runtime();
  
  // Set up default mock provider for testing
  const mockProvider = new MockLLMProvider();
  runtime.registerLLMProvider('mock', mockProvider);
  
  return runtime;
}