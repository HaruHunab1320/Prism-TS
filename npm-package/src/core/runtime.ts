import {
  ASTNode,
  Program,
  IdentifierExpression,
  NumberLiteral,
  StringLiteral,
  InterpolatedString,
  BooleanLiteral,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  TernaryExpression,
  ArrayLiteral,
  ObjectLiteral,
  PropertyAccess,
  IndexAccess,
  ConfidenceExpression,
  AssignmentStatement,
  IfStatement,
  UncertainIfStatement,
  ContextStatement,
  AgentDeclaration,
  BlockStatement,
  ExpressionStatement,
  BinaryOperator,
  LambdaExpression,
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
      .map(([k, v]) => `${k}: ${v.toString()}`)
      .join(', ');
    return `{ ${props} }`;
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
        accumulator = await reducerArg.value([accumulator, array.elements[i], new NumberValue(i)]);
      }

      // Preserve confidence if the original array was confident
      return arrayArg instanceof ConfidenceValue && !(accumulator instanceof ConfidenceValue)
        ? new ConfidenceValue(accumulator, confidence)
        : accumulator;
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
      case 'IndexAccess':
        return this.interpretIndexAccess(node as IndexAccess);
      case 'LambdaExpression':
        return this.interpretLambdaExpression(node as LambdaExpression);
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

  private async interpretIdentifier(node: IdentifierExpression): Promise<Value> {
    try {
      return this.environment.get(node.name);
    } catch (error) {
      throw new RuntimeError(`Undefined variable: ${node.name}`, node);
    }
  }

  private async interpretBinaryExpression(node: BinaryExpression): Promise<Value> {
    // Special handling for property access operators where right side shouldn't be evaluated
    if (node.operator === '.' || node.operator === '~.') {
      const left = await this.interpret(node.left);
      // Don't evaluate right side - it's a property name, not an expression
      return this.applyBinaryOperator(node.operator, left, node.right as IdentifierExpression, node);
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
          right instanceof ArrayValue || right instanceof ObjectValue)) {
      throw new RuntimeError(`Invalid right operand for operator ${operator}`, node);
    }

    // Handle confidence propagation
    if (left instanceof ConfidenceValue || right instanceof ConfidenceValue) {
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
        return new BooleanValue(left.isTruthy() && right.isTruthy());

      case '||':
        return new BooleanValue(left.isTruthy() || right.isTruthy());

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
      elements.push(await this.interpret(elem));
    }
    return new ArrayValue(elements);
  }
  
  private async interpretObjectLiteral(node: ObjectLiteral): Promise<Value> {
    const properties = new Map<string, Value>();
    for (const { key, value } of node.properties) {
      properties.set(key, await this.interpret(value));
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
      // Array methods are handled as built-in functions, not properties
      // They would be called with syntax like: map(array, fn)
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
      
      if (innerValue instanceof ArrayValue && node.property === 'length') {
        return new NumberValue(innerValue.elements.length);
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
    
    return new FunctionValue(`lambda`, async (args: Value[]) => {
      if (args.length !== node.parameters.length) {
        throw new RuntimeError(`Lambda expects ${node.parameters.length} arguments, got ${args.length}`);
      }
      
      // Create new environment for lambda execution
      const lambdaEnv = new Environment(closureEnv);
      
      // Bind parameters to arguments
      for (let i = 0; i < node.parameters.length; i++) {
        lambdaEnv.define(node.parameters[i], args[i]);
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
    });
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