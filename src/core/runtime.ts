import {
  ASTNode,
  Program,
  Statement,
  IdentifierExpression,
  NumberLiteral,
  StringLiteral,
  InterpolatedString,
  BooleanLiteral,
  NullLiteral,
  UndefinedLiteral,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  TernaryExpression,
  ArrayLiteral,
  ObjectLiteral,
  PropertyAccess,
  OptionalChainAccess,
  IndexAccess,
  ConfidenceExpression,
  AssignmentStatement,
  AssignmentExpression,
  IfStatement,
  UncertainIfStatement,
  ContextStatement,
  AgentDeclaration,
  BlockStatement,
  ExpressionStatement,
  BinaryOperator,
  LambdaExpression,
  SpreadElement,
  ForLoop,
  ForInLoop,
  WhileLoop,
  DoWhileLoop,
  BreakStatement as _BreakStatement,
  ContinueStatement as _ContinueStatement,
  UncertainForLoop,
  UncertainWhileLoop,
  ArrayPattern,
  ObjectPattern,
  RestElement,
  DestructuringAssignment,
} from './ast';
import { ConfidenceValue as ConfidenceLib, ConfidenceLevel } from '../confidence';
import { Context, ContextManager } from '../context';
import { LLMProvider, LLMRequest, MockLLMProvider } from '../llm';

export class RuntimeError extends Error {
  public line?: number;
  public column?: number;
  
  constructor(message: string, public node?: ASTNode, location?: { line: number; column: number }) {
    // If location is provided, enhance the error message
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

export class NullValue extends Value {
  type = 'null';
  value = null;

  constructor() {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof NullValue;
  }

  isTruthy(): boolean {
    return false;
  }

  toString(): string {
    return 'null';
  }
}

export class UndefinedValue extends Value {
  type = 'undefined';
  value = undefined;

  constructor() {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof UndefinedValue;
  }

  isTruthy(): boolean {
    return false;
  }

  toString(): string {
    return 'undefined';
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

export class ArrayValue extends Value {
  type = 'array';
  value: Value[];

  constructor(public elements: Value[]) {
    super();
    this.value = elements;
  }

  equals(other: Value): boolean {
    if (!(other instanceof ArrayValue)) return false;
    if (this.elements.length !== other.elements.length) return false;
    return this.elements.every((elem, i) => elem.equals(other.elements[i]));
  }

  isTruthy(): boolean {
    return true;
  }

  toString(): string {
    return `[${this.elements.map(e => e.toString()).join(', ')}]`;
  }
}

export class ObjectValue extends Value {
  type = 'object';
  value: Map<string, Value>;

  constructor(public properties: Map<string, Value>) {
    super();
    this.value = properties;
  }

  equals(other: Value): boolean {
    if (!(other instanceof ObjectValue)) return false;
    if (this.properties.size !== other.properties.size) return false;
    
    for (const [key, value] of this.properties) {
      const otherValue = other.properties.get(key);
      if (!otherValue || !value.equals(otherValue)) return false;
    }
    return true;
  }

  isTruthy(): boolean {
    return true;
  }

  toString(): string {
    const props = Array.from(this.properties.entries())
      .filter(([_, v]) => !(v instanceof UndefinedValue))
      .map(([k, v]) => `${k}: ${v.toString()}`)
      .join(', ');
    return props.length > 0 ? `{ ${props} }` : '{}';
  }
}

export class FunctionValue extends Value {
  type = 'function';

  constructor(
    public name: string,
    public value: (args: Value[]) => Promise<Value>,
    public arity?: number
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

    throw new RuntimeError(`Undefined variable: ${name}`, undefined, undefined);
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

  // Method to get all variables in current scope (for context copying)
  getAllVariables(): Map<string, Value> {
    return new Map(this.variables);
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
      let promptString: string;
      
      // Handle different value types for the prompt
      if (promptValue instanceof StringValue) {
        promptString = promptValue.value;
      } else if (promptValue instanceof ConfidenceValue && promptValue.value instanceof StringValue) {
        // Handle confident string values
        promptString = (promptValue.value as StringValue).value;
      } else {
        throw new RuntimeError('llm() first argument must be a string');
      }

      const provider = this.getDefaultLLMProvider();
      if (!provider) {
        throw new RuntimeError('No LLM provider configured');
      }

      try {
        const request = new LLMRequest(promptString);
        const response = await provider.complete(request);
        
        return new ConfidenceValue(
          new StringValue(response.content),
          response.confidence
        );
      } catch (error) {
        throw new RuntimeError(`LLM call failed: ${(error as Error).message}`);
      }
    }));

    // Add array built-in functions
    this.environment.define('map', new FunctionValue('map', async (args) => {
      if (args.length !== 2) {
        throw new RuntimeError('map() requires exactly 2 arguments: array and function');
      }

      const arrayArg = args[0];
      const fnArg = args[1];

      // Extract array from confident value if needed
      const array = arrayArg instanceof ConfidenceValue ? arrayArg.value : arrayArg;
      const confidence = arrayArg instanceof ConfidenceValue ? arrayArg.confidence : new ConfidenceLib(1.0);

      if (!(array instanceof ArrayValue)) {
        throw new RuntimeError('First argument to map() must be an array');
      }

      if (!(fnArg instanceof FunctionValue)) {
        throw new RuntimeError('Second argument to map() must be a function');
      }

      const results: Value[] = [];
      for (const element of array.elements) {
        const result = await fnArg.value([element]);
        results.push(result);
      }

      const resultArray = new ArrayValue(results);
      return arrayArg instanceof ConfidenceValue 
        ? new ConfidenceValue(resultArray, confidence)
        : resultArray;
    }));

    this.environment.define('filter', new FunctionValue('filter', async (args) => {
      if (args.length !== 2) {
        throw new RuntimeError('filter() requires exactly 2 arguments: array and predicate');
      }

      const arrayArg = args[0];
      const predicateArg = args[1];

      // Extract array from confident value if needed
      const array = arrayArg instanceof ConfidenceValue ? arrayArg.value : arrayArg;
      const confidence = arrayArg instanceof ConfidenceValue ? arrayArg.confidence : new ConfidenceLib(1.0);

      if (!(array instanceof ArrayValue)) {
        throw new RuntimeError('First argument to filter() must be an array');
      }

      if (!(predicateArg instanceof FunctionValue)) {
        throw new RuntimeError('Second argument to filter() must be a function');
      }

      const results: Value[] = [];
      for (const element of array.elements) {
        const predicateResult = await predicateArg.value([element]);
        if (predicateResult.isTruthy()) {
          results.push(element);
        }
      }

      const resultArray = new ArrayValue(results);
      return arrayArg instanceof ConfidenceValue 
        ? new ConfidenceValue(resultArray, confidence)
        : resultArray;
    }));

    this.environment.define('reduce', new FunctionValue('reduce', async (args) => {
      if (args.length < 2 || args.length > 3) {
        throw new RuntimeError('reduce() requires 2 or 3 arguments: array, reducer, and optional initial value');
      }

      const arrayArg = args[0];
      const reducerArg = args[1];
      const initialValue = args.length === 3 ? args[2] : undefined;

      // Extract array from confident value if needed
      const array = arrayArg instanceof ConfidenceValue ? arrayArg.value : arrayArg;
      const confidence = arrayArg instanceof ConfidenceValue ? arrayArg.confidence : new ConfidenceLib(1.0);

      if (!(array instanceof ArrayValue)) {
        throw new RuntimeError('First argument to reduce() must be an array');
      }

      if (!(reducerArg instanceof FunctionValue)) {
        throw new RuntimeError('Second argument to reduce() must be a function');
      }

      if (array.elements.length === 0 && initialValue === undefined) {
        throw new RuntimeError('reduce() of empty array with no initial value');
      }

      let accumulator: Value;
      let startIndex: number;

      if (initialValue !== undefined) {
        accumulator = initialValue;
        startIndex = 0;
      } else {
        accumulator = array.elements[0];
        startIndex = 1;
      }

      for (let i = startIndex; i < array.elements.length; i++) {
        // Only pass index if the reducer expects 3 arguments
        const args = [accumulator, array.elements[i]];
        if (reducerArg.arity === 3) {
          args.push(new NumberValue(i));
        }
        accumulator = await reducerArg.value(args);
      }

      // Preserve confidence if the original array was confident
      return arrayArg instanceof ConfidenceValue && !(accumulator instanceof ConfidenceValue)
        ? new ConfidenceValue(accumulator, confidence)
        : accumulator;
    }));

    // Built-in max function
    this.environment.define('max', new FunctionValue('max', async (args) => {
      if (args.length === 0) {
        throw new RuntimeError('max() requires at least one argument');
      }

      let maxVal: Value | null = null;
      let maxNum: number = -Infinity;
      let maxConfidence: ConfidenceLib | null = null;

      for (const arg of args) {
        let value = arg;
        let confidence: ConfidenceLib | null = null;

        if (arg instanceof ConfidenceValue) {
          value = arg.value;
          confidence = arg.confidence;
        }

        if (!(value instanceof NumberValue)) {
          throw new RuntimeError(`max() requires numeric arguments, got ${value.type}`);
        }

        if (value.value > maxNum) {
          maxNum = value.value;
          maxVal = value;
          maxConfidence = confidence;
        }
      }

      // Return with confidence if any input had confidence
      if (maxConfidence && maxVal) {
        return new ConfidenceValue(maxVal, maxConfidence);
      }
      return maxVal!;
    }));

    // Built-in min function
    this.environment.define('min', new FunctionValue('min', async (args) => {
      if (args.length === 0) {
        throw new RuntimeError('min() requires at least one argument');
      }

      let minVal: Value | null = null;
      let minNum: number = Infinity;
      let minConfidence: ConfidenceLib | null = null;

      for (const arg of args) {
        let value = arg;
        let confidence: ConfidenceLib | null = null;

        if (arg instanceof ConfidenceValue) {
          value = arg.value;
          confidence = arg.confidence;
        }

        if (!(value instanceof NumberValue)) {
          throw new RuntimeError(`min() requires numeric arguments, got ${value.type}`);
        }

        if (value.value < minNum) {
          minNum = value.value;
          minVal = value;
          minConfidence = confidence;
        }
      }

      // Return with confidence if any input had confidence
      if (minConfidence && minVal) {
        return new ConfidenceValue(minVal, minConfidence);
      }
      return minVal!;
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
      case 'InterpolatedString':
        return this.interpretInterpolatedString(node as InterpolatedString);
      case 'BooleanLiteral':
        return this.interpretBooleanLiteral(node as BooleanLiteral);
      case 'NullLiteral':
        return this.interpretNullLiteral(node as NullLiteral);
      case 'UndefinedLiteral':
        return this.interpretUndefinedLiteral(node as UndefinedLiteral);
      case 'IdentifierExpression':
        return this.interpretIdentifier(node as IdentifierExpression);
      case 'BinaryExpression':
        return this.interpretBinaryExpression(node as BinaryExpression);
      case 'UnaryExpression':
        return this.interpretUnaryExpression(node as UnaryExpression);
      case 'CallExpression':
        return this.interpretCallExpression(node as CallExpression);
      case 'TernaryExpression':
        return this.interpretTernaryExpression(node as TernaryExpression);
      case 'ArrayLiteral':
        return this.interpretArrayLiteral(node as ArrayLiteral);
      case 'ObjectLiteral':
        return this.interpretObjectLiteral(node as ObjectLiteral);
      case 'PropertyAccess':
        return this.interpretPropertyAccess(node as PropertyAccess);
      case 'OptionalChainAccess':
        return this.interpretOptionalChainAccess(node as OptionalChainAccess);
      case 'IndexAccess':
        return this.interpretIndexAccess(node as IndexAccess);
      case 'LambdaExpression':
        return this.interpretLambdaExpression(node as LambdaExpression);
      case 'PlaceholderExpression':
        throw new RuntimeError('Placeholder (_) can only be used within pipeline expressions', node);
      case 'ConfidenceExpression':
        return this.interpretConfidenceExpression(node as ConfidenceExpression);
      case 'AssignmentStatement':
        return this.interpretAssignmentStatement(node as AssignmentStatement);
      case 'DestructuringAssignment':
        return this.interpretDestructuringAssignment(node as DestructuringAssignment);
      case 'AssignmentExpression':
        return this.interpretAssignmentExpression(node as AssignmentExpression);
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
      case 'ForLoop':
        return this.interpretForLoop(node as ForLoop);
      case 'ForInLoop':
        return this.interpretForInLoop(node as ForInLoop);
      case 'WhileLoop':
        return this.interpretWhileLoop(node as WhileLoop);
      case 'DoWhileLoop':
        return this.interpretDoWhileLoop(node as DoWhileLoop);
      case 'UncertainForLoop':
        return this.interpretUncertainForLoop(node as UncertainForLoop);
      case 'UncertainWhileLoop':
        return this.interpretUncertainWhileLoop(node as UncertainWhileLoop);
      case 'BreakStatement':
        throw new LoopControlError('break');
      case 'ContinueStatement':
        throw new LoopControlError('continue');
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
  
  private async interpretInterpolatedString(node: InterpolatedString): Promise<Value> {
    let result = '';
    
    // Interpolated strings have n parts and n-1 expressions
    // Example: "Hello ${name}, you are ${age} years old"
    // parts: ["Hello ", ", you are ", " years old"]
    // expressions: [name, age]
    
    for (let i = 0; i < node.parts.length; i++) {
      result += node.parts[i];
      
      // Add the evaluated expression if there is one
      if (i < node.expressions.length) {
        const exprValue = await this.interpret(node.expressions[i]);
        result += exprValue.toString();
      }
    }
    
    return new StringValue(result);
  }

  private async interpretBooleanLiteral(node: BooleanLiteral): Promise<Value> {
    return new BooleanValue(node.value);
  }

  private async interpretNullLiteral(_node: NullLiteral): Promise<Value> {
    return new NullValue();
  }

  private async interpretUndefinedLiteral(_node: UndefinedLiteral): Promise<Value> {
    return new UndefinedValue();
  }

  private async interpretIdentifier(node: IdentifierExpression): Promise<Value> {
    try {
      return this.environment.get(node.name);
    } catch (error) {
      throw new RuntimeError(`Undefined variable: ${node.name}`, node, node.location);
    }
  }

  private async interpretBinaryExpression(node: BinaryExpression): Promise<Value> {
    // Special handling for property access operators where right side shouldn't be evaluated
    if (node.operator === '.' || node.operator === '~.') {
      const left = await this.interpret(node.left);
      // Don't evaluate right side - it's a property name, not an expression
      return this.applyBinaryOperator(node.operator, left, node.right as IdentifierExpression, node);
    }

    // Special handling for short-circuit operators
    if (node.operator === '||' || node.operator === '&&') {
      const left = await this.interpret(node.left);
      
      // Short-circuit evaluation for ||
      if (node.operator === '||' && left.isTruthy()) {
        return left;
      }
      
      // Short-circuit evaluation for &&
      if (node.operator === '&&' && !left.isTruthy()) {
        return left;
      }
      
      // Only evaluate right side if we didn't short-circuit
      const right = await this.interpret(node.right);
      return right;
    }

    const left = await this.interpret(node.left);
    const right = await this.interpret(node.right);

    return this.applyBinaryOperator(node.operator, left, right, node);
  }

  private applyBinaryOperator(
    operator: BinaryOperator,
    left: Value,
    right: Value | IdentifierExpression,
    node: BinaryExpression
  ): Value {
    // Handle property access operators early (they have special right-side handling)
    if (operator === '.') {
      return right as Value;
    }
    if (operator === '~.') {
      return this.applyConfidentPropertyAccess(left, right as IdentifierExpression, node);
    }

    // Ensure right is a Value for all other operators
    if (!(right instanceof NumberValue || right instanceof StringValue || right instanceof BooleanValue || 
          right instanceof ConfidenceValue || right instanceof FunctionValue || 
          right instanceof ArrayValue || right instanceof ObjectValue || right instanceof NullValue || 
          right instanceof UndefinedValue)) {
      throw new RuntimeError(`Invalid right operand for operator ${operator}`, node);
    }

    // Handle confidence propagation (except for instanceof which doesn't propagate confidence)
    if ((left instanceof ConfidenceValue || right instanceof ConfidenceValue) && operator !== 'instanceof') {
      return this.applyBinaryOperatorWithConfidence(operator, left, right as Value, node);
    }

    switch (operator) {
      case '+':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          return new NumberValue(left.value + right.value);
        }
        if (left instanceof StringValue || right instanceof StringValue) {
          return new StringValue(left.toString() + right.toString());
        }
        throw new RuntimeError(`Cannot apply + to ${left.type} and ${right.type}`, node, node.location);

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

      case '**':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          return new NumberValue(Math.pow(left.value, right.value));
        }
        throw new RuntimeError(`Cannot apply ** to ${left.type} and ${right.type}`, node);

      case '%':
        if (left instanceof NumberValue && right instanceof NumberValue) {
          if (right.value === 0) {
            throw new RuntimeError('Modulo by zero', node);
          }
          return new NumberValue(left.value % right.value);
        }
        throw new RuntimeError(`Cannot apply % to ${left.type} and ${right.type}`, node);

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
      case '||':
        // These are handled in interpretBinaryExpression for short-circuit evaluation
        throw new RuntimeError('Logical operators should be handled in interpretBinaryExpression', node);

      case '??':
        // Nullish coalescing - return right if left is null or undefined
        if (left instanceof NullValue || left instanceof UndefinedValue) {
          return right;
        }
        return left;

      case '~~':
        // Confidence chaining - should not reach here as it's handled with confidence
        throw new RuntimeError('Confidence chaining requires confident values', node);

      case '~??':
        // Confidence coalesce - should not reach here as it's handled with confidence
        throw new RuntimeError('Confidence coalesce requires confident values', node);

      case '~&&':
        // Confidence AND - should not reach here as it's handled with confidence
        throw new RuntimeError('Confidence AND requires confident values', node);

      case '~||':
        // Confidence OR - should not reach here as it's handled with confidence
        throw new RuntimeError('Confidence OR requires confident values', node);

      case '~+':
        // Confident addition - should not reach here as it's handled with confidence
        throw new RuntimeError('Confident addition requires confident values', node);

      case '~-':
        // Confident subtraction - should not reach here as it's handled with confidence
        throw new RuntimeError('Confident subtraction requires confident values', node);

      case '~*':
        // Confident multiplication - should not reach here as it's handled with confidence
        throw new RuntimeError('Confident multiplication requires confident values', node);

      case '~/':
        // Confident division - should not reach here as it's handled with confidence
        throw new RuntimeError('Confident division requires confident values', node);

      case '~==':
        // Confident equality - should not reach here as it's handled with confidence
        throw new RuntimeError('Confident equality requires confident values', node);

      case '~!=':
        // Confident not equal - should not reach here as it's handled with confidence
        throw new RuntimeError('Confident not equal requires confident values', node);

      case '~<':
        // Confident less than - should not reach here as it's handled with confidence
        throw new RuntimeError('Confident less than requires confident values', node);

      case '~>=':
        // Confident greater equal - should not reach here as it's handled with confidence
        throw new RuntimeError('Confident greater equal requires confident values', node);

      case '~<=':
        // Confident less equal - should not reach here as it's handled with confidence
        throw new RuntimeError('Confident less equal requires confident values', node);

      case '~||>':
        // Parallel confidence - should not reach here as it's handled with confidence
        throw new RuntimeError('Parallel confidence requires confident values', node);

      case '~@>':
        // Threshold gate - should not reach here as it's handled with confidence
        throw new RuntimeError('Threshold gate requires confident values', node);
        
      case '~|>':
        // Confidence pipeline - should not reach here as it's handled with confidence
        throw new RuntimeError('Confidence pipeline requires confident values', node);
        
      case '~?>':
        // Confidence threshold gate - handle non-confident values
        return this.applyConfidenceThresholdGate(left, right, node);

      case 'instanceof':
        // Check if left is an instance of the constructor/type specified by right
        // For now, we'll check against built-in types
        if (right instanceof StringValue) {
          const typeName = right.value.toLowerCase();
          
          // Handle confidence values by checking the wrapped value
          const valueToCheck = left instanceof ConfidenceValue ? left.value : left;
          
          switch (typeName) {
            case 'number':
              return new BooleanValue(valueToCheck instanceof NumberValue);
            case 'string':
              return new BooleanValue(valueToCheck instanceof StringValue);
            case 'boolean':
              return new BooleanValue(valueToCheck instanceof BooleanValue);
            case 'array':
              return new BooleanValue(valueToCheck instanceof ArrayValue);
            case 'object':
              return new BooleanValue(valueToCheck instanceof ObjectValue);
            case 'function':
              return new BooleanValue(valueToCheck instanceof FunctionValue);
            case 'null':
              return new BooleanValue(valueToCheck instanceof NullValue);
            case 'undefined':
              return new BooleanValue(valueToCheck instanceof UndefinedValue);
            default:
              throw new RuntimeError(`Unknown type name: ${typeName}`, node);
          }
        } else if (right instanceof FunctionValue) {
          // For constructor functions, we would need to track prototype chain
          // For now, we'll just support built-in types
          throw new RuntimeError('instanceof with constructor functions not yet supported', node);
        } else {
          throw new RuntimeError('Right-hand side of instanceof must be a type name or constructor', node);
        }

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
    // Special handling for confidence chaining operator (~~)
    if (operator === '~~') {
      return this.applyConfidenceChaining(left, right, node);
    }

    // Special handling for confidence coalesce operator (~??)
    if (operator === '~??') {
      return this.applyConfidenceCoalesce(left, right, node);
    }

    // Special handling for confident logical operators (~&&, ~||)
    if (operator === '~&&' || operator === '~||') {
      return this.applyConfidentLogical(operator, left, right, node);
    }

    // Special handling for confident arithmetic operators (~+, ~-, ~*, ~/)
    if (operator === '~+' || operator === '~-' || operator === '~*' || operator === '~/') {
      return this.applyConfidentArithmetic(operator, left, right, node);
    }

    // Special handling for confident comparison operators (~==, ~!=, ~<, ~>=, ~<=)
    if (operator === '~==' || operator === '~!=' || operator === '~<' || operator === '~>=' || operator === '~<=') {
      return this.applyConfidentComparison(operator, left, right, node);
    }

    // Special handling for parallel confidence operator (~||>)
    if (operator === '~||>') {
      return this.applyParallelConfidence(left, right, node);
    }

    // Special handling for threshold gate operator (~@>)
    if (operator === '~@>') {
      return this.applyThresholdGate(left, right, node);
    }
    
    // Special handling for confidence pipeline operator (~|>)
    if (operator === '~|>') {
      // For confidence pipeline, if right has confidence, use its confidence
      // Otherwise preserve left's confidence
      if (right instanceof ConfidenceValue) {
        return right; // Right value already has confidence
      }
      const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
      return new ConfidenceValue(right, leftConf);
    }
    
    // Special handling for confidence threshold gate operator (~?>)
    if (operator === '~?>') {
      // This operator works with both confident and non-confident values
      return this.applyConfidenceThresholdGate(left, right, node);
    }

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

  private applyConfidenceChaining(left: Value, right: Value, _node: BinaryExpression): Value {
    // For confidence chaining, the left value becomes the input to the right operation
    // The right side should typically be a function call or another confident expression
    
    // For now, we'll implement a simple chaining where we take the minimum confidence
    // and pass the left value's underlying value to the right operation
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    const rightConf = right instanceof ConfidenceValue ? right.confidence : new ConfidenceLib(1.0);
    
    // Combine confidences using minimum (most conservative approach)
    const chainedConfidence = leftConf.min ? leftConf.min(rightConf) : leftConf;
    
    // For chaining, we return the right value with the chained confidence
    const resultValue = right instanceof ConfidenceValue ? right.value : right;
    
    return new ConfidenceValue(resultValue, chainedConfidence);
  }

  private applyConfidenceCoalesce(left: Value, right: Value, _node: BinaryExpression): Value {
    // For confidence coalesce (~??), return the left value if it has sufficient confidence,
    // otherwise return the right value. This allows for fallback chains.
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    
    // Define threshold for "sufficient confidence" - using medium confidence (0.5) as default
    const SUFFICIENT_CONFIDENCE_THRESHOLD = 0.5;
    
    // If left value has sufficient confidence, return it
    if (leftConf.value >= SUFFICIENT_CONFIDENCE_THRESHOLD) {
      return left;
    }
    
    // Otherwise, return the right value (which becomes the new candidate)
    return right;
  }

  private applyConfidentLogical(operator: '~&&' | '~||', left: Value, right: Value, _node: BinaryExpression): Value {
    // For confident logical operations, we need to consider both the boolean result
    // and the confidence propagation
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    const rightConf = right instanceof ConfidenceValue ? right.confidence : new ConfidenceLib(1.0);
    
    // Extract the boolean values
    const leftBool = left.isTruthy();
    const rightBool = right.isTruthy();
    
    let resultBool: boolean;
    let resultConfidence: ConfidenceLib;
    
    if (operator === '~&&') {
      // Confident AND: both must be true AND confident
      resultBool = leftBool && rightBool;
      // For AND, take minimum confidence (both must be confident)
      resultConfidence = leftConf.min ? leftConf.min(rightConf) : leftConf;
    } else { // operator === '~||'
      // Confident OR: at least one must be true with confidence
      resultBool = leftBool || rightBool;
      // For OR, take maximum confidence (best of the two)
      resultConfidence = leftConf.max ? leftConf.max(rightConf) : leftConf;
    }
    
    return new ConfidenceValue(new BooleanValue(resultBool), resultConfidence);
  }

  private applyConfidentArithmetic(operator: '~+' | '~-' | '~*' | '~/', left: Value, right: Value, node: BinaryExpression): Value {
    // For confident arithmetic operations, we perform the arithmetic and propagate confidence
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    const rightConf = right instanceof ConfidenceValue ? right.confidence : new ConfidenceLib(1.0);
    
    // Extract the numeric values
    const leftValue = left instanceof ConfidenceValue ? left.value : left;
    const rightValue = right instanceof ConfidenceValue ? right.value : right;
    
    // Ensure we have numeric values
    if (!(leftValue instanceof NumberValue) || !(rightValue instanceof NumberValue)) {
      throw new RuntimeError(`Confident arithmetic requires numeric values`, node);
    }
    
    let result: number;
    const leftNum = leftValue.value;
    const rightNum = rightValue.value;
    
    // Perform the arithmetic operation
    switch (operator) {
      case '~+':
        result = leftNum + rightNum;
        break;
      case '~-':
        result = leftNum - rightNum;
        break;
      case '~*':
        result = leftNum * rightNum;
        break;
      case '~/':
        if (rightNum === 0) {
          throw new RuntimeError('Division by zero in confident arithmetic', node);
        }
        result = leftNum / rightNum;
        break;
    }
    
    // For arithmetic operations, use minimum confidence (error propagation principle)
    const resultConfidence = leftConf.min ? leftConf.min(rightConf) : leftConf;
    
    return new ConfidenceValue(new NumberValue(result), resultConfidence);
  }

  private applyConfidentComparison(operator: '~==' | '~!=' | '~<' | '~>=' | '~<=', left: Value, right: Value, node: BinaryExpression): Value {
    // For confident comparison operations, we perform the comparison and propagate confidence
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    const rightConf = right instanceof ConfidenceValue ? right.confidence : new ConfidenceLib(1.0);
    
    // Extract the underlying values
    const leftValue = left instanceof ConfidenceValue ? left.value : left;
    const rightValue = right instanceof ConfidenceValue ? right.value : right;
    
    let result: boolean;
    
    // Perform the comparison operation based on the operator
    switch (operator) {
      case '~==':
        result = leftValue.equals(rightValue);
        break;
      case '~!=':
        result = !leftValue.equals(rightValue);
        break;
      case '~<':
        // For less than, we need numeric values
        if (!(leftValue instanceof NumberValue) || !(rightValue instanceof NumberValue)) {
          throw new RuntimeError(`Confident less than requires numeric values`, node);
        }
        result = leftValue.value < rightValue.value;
        break;
      case '~>=':
        // For greater equal, we need numeric values  
        if (!(leftValue instanceof NumberValue) || !(rightValue instanceof NumberValue)) {
          throw new RuntimeError(`Confident greater equal requires numeric values`, node);
        }
        result = leftValue.value >= rightValue.value;
        break;
      case '~<=':
        // For less equal, we need numeric values
        if (!(leftValue instanceof NumberValue) || !(rightValue instanceof NumberValue)) {
          throw new RuntimeError(`Confident less equal requires numeric values`, node);
        }
        result = leftValue.value <= rightValue.value;
        break;
    }
    
    // For comparison operations, use minimum confidence (both values must be confident for reliable comparison)
    const resultConfidence = leftConf.min ? leftConf.min(rightConf) : leftConf;
    
    return new ConfidenceValue(new BooleanValue(result), resultConfidence);
  }

  private applyConfidentPropertyAccess(left: Value, right: IdentifierExpression, _node: BinaryExpression): Value {
    // For confident property access (~.), we implement safe navigation with confidence propagation
    // Since we don't have full object support yet, this is a simplified implementation
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    
    // For now, since we don't have object types, we'll implement this as a pass-through
    // that propagates confidence. In a full implementation, this would:
    // 1. Check if the property exists
    // 2. Return undefined/null if it doesn't (with reduced confidence)
    // 3. Return the property value with combined confidence if it does
    
    // Extract the property name from the identifier
    const propertyName = right.name;
    const placeholderValue = new StringValue(`${left.toString()}.${propertyName}`);
    
    // Reduce confidence slightly for property access uncertainty
    const PROPERTY_ACCESS_CONFIDENCE_FACTOR = 0.9;
    const reducedConfidence = new ConfidenceLib(leftConf.value * PROPERTY_ACCESS_CONFIDENCE_FACTOR);
    
    return new ConfidenceValue(placeholderValue, reducedConfidence);
  }

  private applyParallelConfidence(left: Value, right: Value, _node: BinaryExpression): Value {
    // For parallel confidence (~||>), we simulate executing multiple operations
    // and selecting the result with the highest confidence
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    const rightConf = right instanceof ConfidenceValue ? right.confidence : new ConfidenceLib(1.0);
    
    // Select the value with higher confidence
    if (leftConf.value >= rightConf.value) {
      return left;
    } else {
      return right;
    }
  }

  private applyThresholdGate(left: Value, right: Value, _node: BinaryExpression): Value {
    // For threshold gate (~@>), execute the right operand only if the left operand
    // meets a confidence threshold. This is useful for conditional execution based on certainty.
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    
    // Define threshold for execution - using medium confidence (0.7) as default
    const EXECUTION_THRESHOLD = 0.7;
    
    // If left value meets the confidence threshold, return the right value
    if (leftConf.value >= EXECUTION_THRESHOLD) {
      return right;
    } else {
      // If threshold not met, return the left value with reduced confidence
      const reducedConfidence = new ConfidenceLib(leftConf.value * 0.5);
      return new ConfidenceValue(left instanceof ConfidenceValue ? left.value : left, reducedConfidence);
    }
  }
  
  private applyConfidenceThresholdGate(left: Value, right: Value, node: BinaryExpression): Value {
    // For confidence threshold gate (~?>), continue the pipeline only if confidence meets threshold
    // Right operand should be either:
    // 1. A number (threshold value between 0 and 1)
    // 2. An array [threshold, defaultValue] for threshold with default
    
    const leftConf = left instanceof ConfidenceValue ? left.confidence : new ConfidenceLib(1.0);
    const leftValue = left instanceof ConfidenceValue ? left.value : left;
    
    // Handle threshold specification
    let threshold: number;
    let defaultValue: Value | undefined;
    
    if (right instanceof ArrayValue && right.value.length === 2) {
      // Format: ~?> [threshold, default]
      const thresholdVal = right.value[0];
      if (!(thresholdVal instanceof NumberValue)) {
        throw new RuntimeError('Threshold gate array first element must be a number', node);
      }
      threshold = thresholdVal.value;
      defaultValue = right.value[1];
    } else if (right instanceof NumberValue) {
      // Format: ~?> threshold
      threshold = right.value;
      defaultValue = new UndefinedValue();
    } else {
      throw new RuntimeError('Threshold gate expects a number or [threshold, default] array', node);
    }
    
    // Validate threshold is between 0 and 1
    if (threshold < 0 || threshold > 1) {
      throw new RuntimeError('Confidence threshold must be between 0 and 1', node);
    }
    
    // Check if confidence meets threshold
    if (leftConf.value >= threshold) {
      // Confidence meets threshold, continue with the value
      return new ConfidenceValue(leftValue, leftConf);
    } else {
      // Confidence below threshold, return default value
      return defaultValue;
    }
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

      case '<~':
        // Confidence extraction - extract confidence from ConfidenceValue
        if (operand instanceof ConfidenceValue) {
          const confidenceValue = operand.confidence.value;
          return new NumberValue(confidenceValue);
        }
        // For non-confident values, return default confidence (1.0)
        return new NumberValue(1.0);

      case 'typeof':
        // Return the type of the operand as a string
        if (operand instanceof NumberValue) {
          return new StringValue('number');
        } else if (operand instanceof StringValue) {
          return new StringValue('string');
        } else if (operand instanceof BooleanValue) {
          return new StringValue('boolean');
        } else if (operand instanceof FunctionValue) {
          return new StringValue('function');
        } else if (operand instanceof ArrayValue) {
          return new StringValue('array');
        } else if (operand instanceof ObjectValue) {
          return new StringValue('object');
        } else if (operand instanceof NullValue) {
          return new StringValue('null');
        } else if (operand instanceof UndefinedValue) {
          return new StringValue('undefined');
        } else if (operand instanceof ConfidenceValue) {
          // For confidence values, return the type of the wrapped value
          const inner = operand.value;
          if (inner instanceof NumberValue) return new StringValue('number');
          if (inner instanceof StringValue) return new StringValue('string');
          if (inner instanceof BooleanValue) return new StringValue('boolean');
          if (inner instanceof FunctionValue) return new StringValue('function');
          if (inner instanceof ArrayValue) return new StringValue('array');
          if (inner instanceof ObjectValue) return new StringValue('object');
          if (inner instanceof NullValue) return new StringValue('null');
          if (inner instanceof UndefinedValue) return new StringValue('undefined');
          return new StringValue('unknown');
        }
        return new StringValue('unknown');

      default:
        throw new RuntimeError(`Unknown unary operator: ${node.operator}`, node);
    }
  }

  private async interpretCallExpression(node: CallExpression): Promise<Value> {
    const callee = await this.interpret(node.callee);

    if (!(callee instanceof FunctionValue)) {
      throw new RuntimeError(`Cannot call non-function value: ${callee.type}`, node, node.location);
    }

    const args: Value[] = [];
    for (const arg of node.args) {
      if (arg instanceof SpreadElement) {
        // Handle spread element
        const spreadValue = await this.interpret(arg.argument);
        if (!(spreadValue instanceof ArrayValue)) {
          throw new RuntimeError(`Cannot spread non-array value: ${spreadValue.type}`, node, node.location);
        }
        // Add all elements from the array
        args.push(...spreadValue.elements);
      } else {
        args.push(await this.interpret(arg));
      }
    }

    return await callee.value(args);
  }

  private async interpretTernaryExpression(node: TernaryExpression): Promise<Value> {
    const condition = await this.interpret(node.condition);
    
    // Check if condition is truthy
    if (condition.isTruthy()) {
      return await this.interpret(node.trueBranch);
    } else {
      return await this.interpret(node.falseBranch);
    }
  }

  private async interpretArrayLiteral(node: ArrayLiteral): Promise<Value> {
    const elements: Value[] = [];
    for (const elem of node.elements) {
      if (elem === null) {
        // Hole in array - this is handled during destructuring
        elements.push(new UndefinedValue());
      } else if (elem instanceof SpreadElement) {
        // Handle spread element
        let spreadValue = await this.interpret(elem.argument);
        
        // Unwrap confidence if needed
        if (spreadValue instanceof ConfidenceValue) {
          spreadValue = spreadValue.value;
        }
        
        if (spreadValue instanceof ArrayValue) {
          // Spread array elements
          elements.push(...spreadValue.value);
        } else {
          throw new RuntimeError(`Cannot spread non-array value`, elem);
        }
      } else {
        elements.push(await this.interpret(elem));
      }
    }
    return new ArrayValue(elements);
  }
  
  private async interpretObjectLiteral(node: ObjectLiteral): Promise<Value> {
    const properties = new Map<string, Value>();
    for (const prop of node.properties) {
      if (prop.value instanceof SpreadElement) {
        // Handle spread element
        let spreadValue = await this.interpret(prop.value.argument);
        
        // Unwrap confidence if needed
        if (spreadValue instanceof ConfidenceValue) {
          spreadValue = spreadValue.value;
        }
        
        if (spreadValue instanceof ObjectValue) {
          // Spread object properties
          for (const [k, v] of spreadValue.value.entries()) {
            properties.set(k, v);
          }
        } else {
          throw new RuntimeError(`Cannot spread non-object value`, prop.value);
        }
      } else {
        // Regular property
        properties.set(prop.key!, await this.interpret(prop.value));
      }
    }
    return new ObjectValue(properties);
  }
  
  private async interpretPropertyAccess(node: PropertyAccess): Promise<Value> {
    const object = await this.interpret(node.object);
    
    // Handle array methods
    if (object instanceof ArrayValue) {
      if (node.property === 'length') {
        return new NumberValue(object.elements.length);
      }
      
      // Array methods as properties
      if (node.property === 'map') {
        return new FunctionValue('map', async (args: Value[]) => {
          if (args.length !== 1) {
            throw new RuntimeError('Array.map() requires exactly 1 argument: function');
          }
          const fn = args[0];
          if (!(fn instanceof FunctionValue)) {
            throw new RuntimeError('Argument to map() must be a function');
          }
          
          const results: Value[] = [];
          for (const element of object.elements) {
            const result = await fn.value([element]);
            results.push(result);
          }
          return new ArrayValue(results);
        });
      }
      
      if (node.property === 'filter') {
        return new FunctionValue('filter', async (args: Value[]) => {
          if (args.length !== 1) {
            throw new RuntimeError('Array.filter() requires exactly 1 argument: predicate');
          }
          const predicate = args[0];
          if (!(predicate instanceof FunctionValue)) {
            throw new RuntimeError('Argument to filter() must be a function');
          }
          
          const results: Value[] = [];
          for (const element of object.elements) {
            const predicateResult = await predicate.value([element]);
            if (predicateResult.isTruthy()) {
              results.push(element);
            }
          }
          return new ArrayValue(results);
        });
      }
      
      if (node.property === 'reduce') {
        return new FunctionValue('reduce', async (args: Value[]) => {
          if (args.length < 1 || args.length > 2) {
            throw new RuntimeError('Array.reduce() requires 1 or 2 arguments: reducer and optional initial value');
          }
          const reducer = args[0];
          const initialValue = args.length === 2 ? args[1] : undefined;
          
          if (!(reducer instanceof FunctionValue)) {
            throw new RuntimeError('First argument to reduce() must be a function');
          }
          
          if (object.elements.length === 0 && initialValue === undefined) {
            throw new RuntimeError('reduce() of empty array with no initial value');
          }
          
          let accumulator: Value;
          let startIndex: number;
          
          if (initialValue !== undefined) {
            accumulator = initialValue;
            startIndex = 0;
          } else {
            accumulator = object.elements[0];
            startIndex = 1;
          }
          
          for (let i = startIndex; i < object.elements.length; i++) {
            // Only pass index if the reducer expects 3 arguments
            const args = [accumulator, object.elements[i]];
            if (reducer.arity === 3) {
              args.push(new NumberValue(i));
            }
            accumulator = await reducer.value(args);
          }
          
          return accumulator;
        });
      }
      
      if (node.property === 'push') {
        return new FunctionValue('push', async (args: Value[]) => {
          if (args.length === 0) {
            throw new RuntimeError('Array.push() requires at least 1 argument');
          }
          // Since arrays are immutable in Prism, return a new array
          const newElements = [...object.elements, ...args];
          return new ArrayValue(newElements);
        });
      }
      
      if (node.property === 'forEach') {
        return new FunctionValue('forEach', async (args: Value[]) => {
          if (args.length !== 1) {
            throw new RuntimeError('Array.forEach() requires exactly 1 argument: function');
          }
          const fn = args[0];
          if (!(fn instanceof FunctionValue)) {
            throw new RuntimeError('Argument to forEach() must be a function');
          }
          
          for (let i = 0; i < object.elements.length; i++) {
            // Only pass index if the function expects 2 arguments
            const args = [object.elements[i]];
            if (fn.arity === 2) {
              args.push(new NumberValue(i));
            }
            await fn.value(args);
          }
          return new UndefinedValue();
        });
      }
      
      if (node.property === 'join') {
        return new FunctionValue('join', async (args: Value[]) => {
          if (args.length > 1) {
            throw new RuntimeError('Array.join() requires 0 or 1 argument');
          }
          
          let separator = ',';
          if (args.length === 1) {
            if (!(args[0] instanceof StringValue)) {
              throw new RuntimeError('Array.join() separator must be a string');
            }
            separator = args[0].value;
          }
          
          const strings = object.elements.map(el => {
            if (el instanceof StringValue) {
              return el.value;
            } else if (el instanceof NumberValue) {
              return el.value.toString();
            } else if (el instanceof BooleanValue) {
              return el.value.toString();
            } else if (el instanceof NullValue) {
              return '';
            } else if (el instanceof UndefinedValue) {
              return '';
            } else {
              return el.toString();
            }
          });
          
          return new StringValue(strings.join(separator));
        });
      }
    }
    
    // Handle object property access
    if (object instanceof ObjectValue) {
      const value = object.properties.get(node.property);
      if (!value) {
        throw new RuntimeError(`Property '${node.property}' does not exist`, node);
      }
      return value;
    }
    
    // Handle confidence values by accessing property on underlying value
    if (object instanceof ConfidenceValue) {
      const innerValue = object.value;
      const confidence = object.confidence;
      
      if (innerValue instanceof ArrayValue) {
        if (node.property === 'length') {
          return new NumberValue(innerValue.elements.length);
        }
        
        // Array methods on confident arrays
        if (node.property === 'map') {
          return new FunctionValue('map', async (args: Value[]) => {
            if (args.length !== 1) {
              throw new RuntimeError('Array.map() requires exactly 1 argument: function');
            }
            const fn = args[0];
            if (!(fn instanceof FunctionValue)) {
              throw new RuntimeError('Argument to map() must be a function');
            }
            
            const results: Value[] = [];
            for (const element of innerValue.elements) {
              const result = await fn.value([element]);
              results.push(result);
            }
            return new ConfidenceValue(new ArrayValue(results), confidence);
          });
        }
        
        if (node.property === 'filter') {
          return new FunctionValue('filter', async (args: Value[]) => {
            if (args.length !== 1) {
              throw new RuntimeError('Array.filter() requires exactly 1 argument: predicate');
            }
            const predicate = args[0];
            if (!(predicate instanceof FunctionValue)) {
              throw new RuntimeError('Argument to filter() must be a function');
            }
            
            const results: Value[] = [];
            for (const element of innerValue.elements) {
              const predicateResult = await predicate.value([element]);
              if (predicateResult.isTruthy()) {
                results.push(element);
              }
            }
            return new ConfidenceValue(new ArrayValue(results), confidence);
          });
        }
        
        if (node.property === 'reduce') {
          return new FunctionValue('reduce', async (args: Value[]) => {
            if (args.length < 1 || args.length > 2) {
              throw new RuntimeError('Array.reduce() requires 1 or 2 arguments: reducer and optional initial value');
            }
            const reducer = args[0];
            const initialValue = args.length === 2 ? args[1] : undefined;
            
            if (!(reducer instanceof FunctionValue)) {
              throw new RuntimeError('First argument to reduce() must be a function');
            }
            
            if (innerValue.elements.length === 0 && initialValue === undefined) {
              throw new RuntimeError('reduce() of empty array with no initial value');
            }
            
            let accumulator: Value;
            let startIndex: number;
            
            if (initialValue !== undefined) {
              accumulator = initialValue;
              startIndex = 0;
            } else {
              accumulator = innerValue.elements[0];
              startIndex = 1;
            }
            
            for (let i = startIndex; i < innerValue.elements.length; i++) {
              // Only pass index if the reducer expects 3 arguments
              const args = [accumulator, innerValue.elements[i]];
              if (reducer.arity === 3) {
                args.push(new NumberValue(i));
              }
              accumulator = await reducer.value(args);
            }
            
            // Preserve confidence if result isn't already confident
            return accumulator instanceof ConfidenceValue ? accumulator : new ConfidenceValue(accumulator, confidence);
          });
        }
        
        if (node.property === 'push') {
          return new FunctionValue('push', async (args: Value[]) => {
            if (args.length === 0) {
              throw new RuntimeError('Array.push() requires at least 1 argument');
            }
            // Since arrays are immutable in Prism, return a new array
            const newElements = [...innerValue.elements, ...args];
            return new ConfidenceValue(new ArrayValue(newElements), confidence);
          });
        }
        
        if (node.property === 'forEach') {
          return new FunctionValue('forEach', async (args: Value[]) => {
            if (args.length !== 1) {
              throw new RuntimeError('Array.forEach() requires exactly 1 argument: function');
            }
            const fn = args[0];
            if (!(fn instanceof FunctionValue)) {
              throw new RuntimeError('Argument to forEach() must be a function');
            }
            
            for (let i = 0; i < innerValue.elements.length; i++) {
              // Only pass index if the function expects 2 arguments
              const args = [innerValue.elements[i]];
              if (fn.arity === 2) {
                args.push(new NumberValue(i));
              }
              await fn.value(args);
            }
            return new UndefinedValue();
          });
        }
        
        if (node.property === 'join') {
          return new FunctionValue('join', async (args: Value[]) => {
            if (args.length > 1) {
              throw new RuntimeError('Array.join() requires 0 or 1 argument');
            }
            
            let separator = ',';
            if (args.length === 1) {
              if (!(args[0] instanceof StringValue)) {
                throw new RuntimeError('Array.join() separator must be a string');
              }
              separator = args[0].value;
            }
            
            const strings = innerValue.elements.map(el => {
              if (el instanceof StringValue) {
                return el.value;
              } else if (el instanceof NumberValue) {
                return el.value.toString();
              } else if (el instanceof BooleanValue) {
                return el.value.toString();
              } else if (el instanceof NullValue) {
                return '';
              } else if (el instanceof UndefinedValue) {
                return '';
              } else {
                return el.toString();
              }
            });
            
            return new ConfidenceValue(new StringValue(strings.join(separator)), confidence);
          });
        }
      }
      
      if (innerValue instanceof ObjectValue) {
        const value = innerValue.properties.get(node.property);
        if (!value) {
          throw new RuntimeError(`Property '${node.property}' does not exist`, node);
        }
        // Wrap result in confidence value with same confidence
        return new ConfidenceValue(value, object.confidence);
      }
    }
    
    throw new RuntimeError(`Cannot access property '${node.property}' on ${object.type}`, node);
  }

  private async interpretOptionalChainAccess(node: OptionalChainAccess): Promise<Value> {
    const object = await this.interpret(node.object);
    
    // If object is null or undefined, return null instead of throwing
    if (object instanceof NullValue || object instanceof UndefinedValue) {
      return new NullValue();
    }
    
    // Handle array methods
    if (object instanceof ArrayValue) {
      if (node.property === 'length') {
        return new NumberValue(object.elements.length);
      }
    }
    
    // Handle object property access
    if (object instanceof ObjectValue) {
      const value = object.properties.get(node.property);
      if (!value) {
        return new NullValue();
      }
      return value;
    }
    
    // Handle confidence values by accessing property on underlying value
    if (object instanceof ConfidenceValue) {
      const innerValue = object.value;
      
      if (innerValue instanceof NullValue || innerValue instanceof UndefinedValue) {
        return new NullValue();
      }
      
      if (innerValue instanceof ArrayValue && node.property === 'length') {
        return new NumberValue(innerValue.elements.length);
      }
      
      if (innerValue instanceof ObjectValue) {
        const value = innerValue.properties.get(node.property);
        if (!value) {
          return new NullValue();
        }
        // Wrap result in confidence value with same confidence
        return new ConfidenceValue(value, object.confidence);
      }
    }
    
    // For other types, return null instead of throwing
    return new NullValue();
  }
  
  private async interpretIndexAccess(node: IndexAccess): Promise<Value> {
    const object = await this.interpret(node.object);
    const index = await this.interpret(node.index);
    
    if (object instanceof ArrayValue) {
      if (!(index instanceof NumberValue)) {
        throw new RuntimeError('Array index must be a number', node);
      }
      
      const idx = Math.floor(index.value);
      if (idx < 0 || idx >= object.elements.length) {
        throw new RuntimeError(`Array index ${idx} out of bounds`, node);
      }
      
      return object.elements[idx];
    }
    
    // Handle confidence values
    if (object instanceof ConfidenceValue && object.value instanceof ArrayValue) {
      // Index access on confident array
      if (!(index instanceof NumberValue)) {
        throw new RuntimeError('Array index must be a number', node);
      }
      
      const innerArray = object.value as ArrayValue;
      const idx = Math.floor(index.value);
      if (idx < 0 || idx >= innerArray.elements.length) {
        throw new RuntimeError(`Array index ${idx} out of bounds`, node);
      }
      
      return new ConfidenceValue(innerArray.elements[idx], object.confidence);
    }
    
    throw new RuntimeError(`Cannot index ${object.type}`, node);
  }
  
  private async interpretLambdaExpression(node: LambdaExpression): Promise<Value> {
    // Create a closure that captures the current environment
    const closureEnv = this.environment;
    
    const fn = new FunctionValue(`lambda`, async (args: Value[]) => {
      // Handle rest parameters
      if (node.restParameter) {
        // With rest parameter, we need at least as many args as regular params
        if (args.length < node.parameters.length) {
          throw new RuntimeError(`Lambda expects at least ${node.parameters.length} arguments, got ${args.length}`);
        }
      } else {
        // Without rest parameter, exact match required
        if (args.length !== node.parameters.length) {
          throw new RuntimeError(`Lambda expects ${node.parameters.length} arguments, got ${args.length}`);
        }
      }
      
      // Create new environment for lambda execution
      const lambdaEnv = new Environment(closureEnv);
      
      // Bind regular parameters to arguments
      for (let i = 0; i < node.parameters.length; i++) {
        const param = node.parameters[i];
        const arg = args[i];
        
        if (typeof param === 'string') {
          // Simple parameter
          lambdaEnv.define(param, arg);
        } else if (param instanceof ArrayPattern || param instanceof ObjectPattern) {
          // Destructuring parameter - use lambda environment for bindings
          const previousEnv = this.environment;
          this.environment = lambdaEnv;
          try {
            if (param instanceof ArrayPattern) {
              await this.destructureArray(param, arg);
            } else {
              await this.destructureObject(param, arg);
            }
          } finally {
            this.environment = previousEnv;
          }
        }
      }
      
      // Bind rest parameter if present
      if (node.restParameter) {
        const restArgs = args.slice(node.parameters.length);
        if (typeof node.restParameter === 'string') {
          lambdaEnv.define(node.restParameter, new ArrayValue(restArgs));
        } else {
          // Rest parameter with destructuring pattern
          const previousEnv = this.environment;
          this.environment = lambdaEnv;
          try {
            const restArray = new ArrayValue(restArgs);
            if (node.restParameter instanceof ArrayPattern) {
              await this.destructureArray(node.restParameter, restArray);
            } else if (node.restParameter instanceof ObjectPattern) {
              await this.destructureObject(node.restParameter, restArray);
            }
          } finally {
            this.environment = previousEnv;
          }
        }
      }
      
      // Execute lambda body in the new environment
      const previousEnv = this.environment;
      this.environment = lambdaEnv;
      
      try {
        const result = await this.interpret(node.body);
        return result;
      } finally {
        this.environment = previousEnv;
      }
    }, node.restParameter ? -1 : node.parameters.length); // -1 indicates variadic
    
    return fn;
  }

  private async interpretConfidenceExpression(node: ConfidenceExpression): Promise<Value> {
    const expression = await this.interpret(node.expression);
    const confidenceValue = await this.interpret(node.confidence);
    
    // Extract numeric value from the confidence expression
    let confidenceNumber: number;
    if (confidenceValue instanceof NumberValue) {
      confidenceNumber = confidenceValue.value;
    } else if (confidenceValue instanceof ConfidenceValue && confidenceValue.value instanceof NumberValue) {
      confidenceNumber = (confidenceValue.value as NumberValue).value;
    } else {
      throw new RuntimeError('Confidence value must be a number', node);
    }
    
    const confidence = new ConfidenceLib(confidenceNumber);
    return new ConfidenceValue(expression, confidence);
  }

  private async interpretAssignmentStatement(node: AssignmentStatement): Promise<Value> {
    const value = await this.interpret(node.value);
    this.environment.set(node.identifier, value);
    return value;
  }

  private async interpretAssignmentExpression(node: AssignmentExpression): Promise<Value> {
    const value = await this.interpret(node.value);
    this.environment.set(node.identifier, value);
    return value;
  }
  
  private async interpretDestructuringAssignment(node: DestructuringAssignment): Promise<Value> {
    const value = await this.interpret(node.value);
    
    // Handle global confidence threshold (Option 1)
    let globalThreshold: number | undefined;
    if (node.confidenceThreshold) {
      const thresholdValue = await this.interpret(node.confidenceThreshold);
      if (!(thresholdValue instanceof NumberValue)) {
        throw new RuntimeError('Confidence threshold must be a number', node);
      }
      globalThreshold = thresholdValue.value;
    }
    
    if (node.pattern instanceof ArrayPattern) {
      await this.destructureArray(node.pattern, value, globalThreshold);
    } else if (node.pattern instanceof ObjectPattern) {
      await this.destructureObject(node.pattern, value, globalThreshold);
    }
    
    return value;
  }
  
  private async destructureArray(pattern: ArrayPattern, value: Value, globalThreshold?: number): Promise<void> {
    if (!(value instanceof ArrayValue)) {
      throw new RuntimeError('Cannot destructure non-array value', pattern);
    }
    
    const array = value.value;
    let restStartIndex = pattern.elements.length;
    
    // Find if there's a rest element
    for (let i = 0; i < pattern.elements.length; i++) {
      if (pattern.elements[i] instanceof RestElement) {
        restStartIndex = i;
        break;
      }
    }
    
    // Process regular elements
    for (let i = 0; i < restStartIndex; i++) {
      const element = pattern.elements[i];
      const arrayValue = i < array.length ? array[i] : new UndefinedValue();
      
      if (element === null) {
        // Skip hole
        continue;
      }
      
      // Check confidence threshold
      let shouldAssign = true;
      
      // Option 3: Per-element threshold
      if (pattern.elementThresholds && pattern.elementThresholds[i]) {
        const thresholdExpr = pattern.elementThresholds[i]!;
        const thresholdValue = await this.interpret(thresholdExpr);
        if (!(thresholdValue instanceof NumberValue)) {
          throw new RuntimeError('Element confidence threshold must be a number', pattern);
        }
        const threshold = thresholdValue.value;
        shouldAssign = this.meetsConfidenceThreshold(arrayValue, threshold);
      }
      // Option 1: Global threshold
      else if (globalThreshold !== undefined) {
        shouldAssign = this.meetsConfidenceThreshold(arrayValue, globalThreshold);
      }
      
      if (!shouldAssign) {
        // Assign undefined if confidence is too low
        if (element instanceof IdentifierExpression) {
          this.environment.set(element.name, new UndefinedValue());
        } else if (element instanceof ArrayPattern) {
          await this.destructureArray(element, new ArrayValue([]), globalThreshold);
        } else if (element instanceof ObjectPattern) {
          await this.destructureObject(element, new ObjectValue(new Map()), globalThreshold);
        }
      } else {
        if (element instanceof IdentifierExpression) {
          this.environment.set(element.name, arrayValue);
        } else if (element instanceof ArrayPattern) {
          await this.destructureArray(element, arrayValue, globalThreshold);
        } else if (element instanceof ObjectPattern) {
          await this.destructureObject(element, arrayValue, globalThreshold);
        }
      }
    }
    
    // Process rest element if present
    if (restStartIndex < pattern.elements.length) {
      const restElement = pattern.elements[restStartIndex] as RestElement;
      const restArray: Value[] = [];
      
      // Filter rest elements by confidence threshold
      for (let i = restStartIndex; i < array.length; i++) {
        const val = array[i];
        if (globalThreshold !== undefined) {
          if (this.meetsConfidenceThreshold(val, globalThreshold)) {
            restArray.push(val);
          }
        } else {
          restArray.push(val);
        }
      }
      
      this.environment.set(restElement.argument.name, new ArrayValue(restArray));
    }
  }
  
  private meetsConfidenceThreshold(value: Value, threshold: number): boolean {
    if (value instanceof ConfidenceValue) {
      return value.confidence.value >= threshold;
    }
    // Non-confident values are treated as having confidence 1.0
    return 1.0 >= threshold;
  }
  
  private async destructureObject(pattern: ObjectPattern, value: Value, globalThreshold?: number): Promise<void> {
    if (!(value instanceof ObjectValue)) {
      throw new RuntimeError('Cannot destructure non-object value', pattern);
    }
    
    const obj = value.value;
    const extractedKeys = new Set<string>();
    
    // Process properties
    for (const prop of pattern.properties) {
      const objValue = obj.get(prop.key);
      let assignValue: Value;
      
      if (objValue !== undefined) {
        assignValue = objValue;
        extractedKeys.add(prop.key);
      } else if (prop.defaultValue) {
        assignValue = await this.interpret(prop.defaultValue);
      } else {
        assignValue = new UndefinedValue();
      }
      
      // Check confidence threshold
      let shouldAssign = true;
      
      // Option 3: Per-property threshold
      if (prop.confidenceThreshold) {
        const thresholdValue = await this.interpret(prop.confidenceThreshold);
        if (!(thresholdValue instanceof NumberValue)) {
          throw new RuntimeError('Property confidence threshold must be a number', pattern);
        }
        const threshold = thresholdValue.value;
        shouldAssign = this.meetsConfidenceThreshold(assignValue, threshold);
      }
      // Option 1: Global threshold
      else if (globalThreshold !== undefined) {
        shouldAssign = this.meetsConfidenceThreshold(assignValue, globalThreshold);
      }
      
      if (!shouldAssign) {
        // Assign undefined if confidence is too low
        if (prop.value instanceof IdentifierExpression) {
          this.environment.set(prop.value.name, new UndefinedValue());
        } else if (prop.value instanceof ArrayPattern) {
          await this.destructureArray(prop.value, new ArrayValue([]), globalThreshold);
        } else if (prop.value instanceof ObjectPattern) {
          await this.destructureObject(prop.value, new ObjectValue(new Map()), globalThreshold);
        }
      } else {
        if (prop.value instanceof IdentifierExpression) {
          this.environment.set(prop.value.name, assignValue);
        } else if (prop.value instanceof ArrayPattern) {
          // If this property has a confidence threshold, use it as the global threshold for the nested pattern
          const nestedThreshold = prop.confidenceThreshold ? 
            (await this.interpret(prop.confidenceThreshold) as NumberValue).value : 
            globalThreshold;
          await this.destructureArray(prop.value, assignValue, nestedThreshold);
        } else if (prop.value instanceof ObjectPattern) {
          // If this property has a confidence threshold, use it as the global threshold for the nested pattern
          const nestedThreshold = prop.confidenceThreshold ? 
            (await this.interpret(prop.confidenceThreshold) as NumberValue).value : 
            globalThreshold;
          await this.destructureObject(prop.value, assignValue, nestedThreshold);
        }
      }
    }
    
    // Process rest element if present
    if (pattern.rest) {
      const restObj = new Map<string, Value>();
      for (const [key, val] of obj.entries()) {
        if (!extractedKeys.has(key)) {
          // Filter by global threshold if specified
          if (globalThreshold !== undefined) {
            if (this.meetsConfidenceThreshold(val, globalThreshold)) {
              restObj.set(key, val);
            }
          } else {
            restObj.set(key, val);
          }
        }
      }
      this.environment.set(pattern.rest.argument.name, new ObjectValue(restObj));
    }
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
      let result: Value;
      
      // Special handling for context: if body is a BlockStatement, 
      // execute its statements directly without creating a new scope
      if (node.body.type === 'BlockStatement') {
        const blockBody = node.body as BlockStatement;
        result = new NumberValue(0); // default
        
        for (const statement of blockBody.statements) {
          result = await this.interpret(statement);
        }
      } else {
        result = await this.interpret(node.body);
      }
      
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

  private async interpretForLoop(node: ForLoop): Promise<Value> {
    // Create new scope for loop
    const loopEnv = new Environment(this.environment);
    const previousEnv = this.environment;
    this.environment = loopEnv;

    try {
      // Execute init
      if (node.init) {
        await this.interpret(node.init);
      }

      let result: Value = new UndefinedValue();

      // Loop while condition is true
      while (true) {
        // Check condition
        if (node.condition) {
          const conditionValue = await this.interpret(node.condition);
          if (!conditionValue.isTruthy()) {
            break;
          }
        }

        // Execute body
        try {
          result = await this.interpret(node.body);
        } catch (error) {
          if (error instanceof LoopControlError) {
            if (error.type === 'break') {
              break;
            } else if (error.type === 'continue') {
              // Continue to update expression
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }

        // Execute update
        if (node.update) {
          await this.interpret(node.update);
        }
      }

      return result;
    } finally {
      this.environment = previousEnv;
    }
  }

  private async interpretForInLoop(node: ForInLoop): Promise<Value> {
    // Evaluate iterable
    let iterableValue = await this.interpret(node.iterable);
    
    // Unwrap confidence if needed
    if (iterableValue instanceof ConfidenceValue) {
      iterableValue = iterableValue.value;
    }
    
    if (!(iterableValue instanceof ArrayValue)) {
      throw new RuntimeError('for...in loop requires an array', node);
    }

    // Create new scope for loop
    const loopEnv = new Environment(this.environment);
    const previousEnv = this.environment;
    this.environment = loopEnv;

    try {
      let result: Value = new UndefinedValue();

      // Iterate over array elements
      for (let i = 0; i < iterableValue.elements.length; i++) {
        // Set loop variables
        loopEnv.define(node.variable, iterableValue.elements[i]);
        
        if (node.index) {
          loopEnv.define(node.index, new NumberValue(i));
        }

        // Execute body
        try {
          result = await this.interpret(node.body);
        } catch (error) {
          if (error instanceof LoopControlError) {
            if (error.type === 'break') {
              break;
            } else if (error.type === 'continue') {
              continue;
            }
          } else {
            throw error;
          }
        }
      }

      return result;
    } finally {
      this.environment = previousEnv;
    }
  }

  private async interpretWhileLoop(node: WhileLoop): Promise<Value> {
    let result: Value = new UndefinedValue();

    while (true) {
      // Check condition
      const conditionValue = await this.interpret(node.condition);
      if (!conditionValue.isTruthy()) {
        break;
      }

      // Execute body
      try {
        result = await this.interpret(node.body);
      } catch (error) {
        if (error instanceof LoopControlError) {
          if (error.type === 'break') {
            break;
          } else if (error.type === 'continue') {
            continue;
          }
        } else {
          throw error;
        }
      }
    }

    return result;
  }

  private async interpretDoWhileLoop(node: DoWhileLoop): Promise<Value> {
    let result: Value = new UndefinedValue();

    do {
      // Execute body
      try {
        result = await this.interpret(node.body);
      } catch (error) {
        if (error instanceof LoopControlError) {
          if (error.type === 'break') {
            break;
          } else if (error.type === 'continue') {
            // Check condition before continuing
            const conditionValue = await this.interpret(node.condition);
            if (!conditionValue.isTruthy()) {
              break;
            }
            continue;
          }
        } else {
          throw error;
        }
      }

      // Check condition
      const conditionValue = await this.interpret(node.condition);
      if (!conditionValue.isTruthy()) {
        break;
      }
    } while (true);

    return result;
  }
  
  private async interpretUncertainForLoop(node: UncertainForLoop): Promise<Value> {
    // Create scope for loop variable if needed
    const loopEnv = new Environment(this.environment);
    const previousEnv = this.environment;
    this.environment = loopEnv;

    try {
      // Execute init
      if (node.init) {
        await this.interpret(node.init);
      }

      let result: Value = new UndefinedValue();
      
      // Track overall loop confidence
      let loopConfidence = new ConfidenceLib(1.0);

      // Loop while condition is true
      while (true) {
        // Check condition and extract confidence
        if (node.condition) {
          const conditionValue = await this.interpret(node.condition);
          
          // Extract confidence from condition
          if (conditionValue instanceof ConfidenceValue) {
            loopConfidence = conditionValue.confidence;
            if (!conditionValue.value.isTruthy()) {
              break;
            }
          } else {
            // Non-confident condition defaults to high confidence
            if (!conditionValue.isTruthy()) {
              break;
            }
          }
        }

        // Execute branch based on confidence level
        const level = loopConfidence.level;
        let branchToExecute: Statement | undefined;
        
        if (level === ConfidenceLevel.HIGH && node.branches.high) {
          branchToExecute = node.branches.high;
        } else if (level === ConfidenceLevel.MEDIUM && node.branches.medium) {
          branchToExecute = node.branches.medium;
        } else if (node.branches.low) {
          branchToExecute = node.branches.low;
        }

        if (branchToExecute) {
          try {
            result = await this.interpret(branchToExecute);
          } catch (error) {
            if (error instanceof LoopControlError) {
              if (error.type === 'break') {
                break;
              } else if (error.type === 'continue') {
                // Continue to update expression
              } else {
                throw error;
              }
            } else {
              throw error;
            }
          }
        }

        // Execute update
        if (node.update) {
          await this.interpret(node.update);
        }
      }

      return result;
    } finally {
      this.environment = previousEnv;
    }
  }
  
  private async interpretUncertainWhileLoop(node: UncertainWhileLoop): Promise<Value> {
    let result: Value = new UndefinedValue();

    while (true) {
      // Check condition and extract confidence
      const conditionValue = await this.interpret(node.condition);
      
      let loopConfidence: ConfidenceLib;
      let shouldContinue: boolean;
      
      if (conditionValue instanceof ConfidenceValue) {
        loopConfidence = conditionValue.confidence;
        shouldContinue = conditionValue.value.isTruthy();
      } else {
        // Non-confident condition defaults to high confidence
        loopConfidence = new ConfidenceLib(1.0);
        shouldContinue = conditionValue.isTruthy();
      }
      
      if (!shouldContinue) {
        break;
      }

      // Execute branch based on confidence level
      const level = loopConfidence.level;
      let branchToExecute: Statement | undefined;
      
      if (level === ConfidenceLevel.HIGH && node.branches.high) {
        branchToExecute = node.branches.high;
      } else if (level === ConfidenceLevel.MEDIUM && node.branches.medium) {
        branchToExecute = node.branches.medium;
      } else if (node.branches.low) {
        branchToExecute = node.branches.low;
      }

      if (branchToExecute) {
        try {
          result = await this.interpret(branchToExecute);
        } catch (error) {
          if (error instanceof LoopControlError) {
            if (error.type === 'break') {
              break;
            } else if (error.type === 'continue') {
              continue;
            }
          } else {
            throw error;
          }
        }
      }
    }

    return result;
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