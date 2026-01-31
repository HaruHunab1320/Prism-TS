import {
  ASTNode,
  Program,
  Statement,
  Expression,
  IdentifierExpression,
  NumberLiteral,
  StringLiteral,
  InterpolatedString,
  BooleanLiteral,
  NullLiteral,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  TernaryExpression,
  ConfidentTernaryExpression,
  ArrayLiteral,
  ObjectLiteral,
  PropertyAccess,
  OptionalChainAccess,
  IndexAccess,
  ConfidenceExpression,
  AssignmentStatement,
  AssignmentExpression,
  AwaitExpression,
  IfStatement,
  UncertainIfStatement,
  BlockStatement,
  ContextStatement,
  ExpressionStatement,
  BinaryOperator,
  LambdaExpression,
  SpreadElement,
  ForLoop,
  ForInLoop,
  WhileLoop,
  DoWhileLoop,
  UncertainForLoop,
  UncertainWhileLoop,
  ArrayPattern,
  ObjectPattern,
  RestElement,
  DestructuringAssignment,
  MatchExpression,
  FunctionDeclaration,
  ReturnStatement,
  VariableDeclaration,
  ImportStatement,
  ExportStatement,
  TryStatement,
  AgentDeclaration,
} from './ast';
import { ConfidenceValue as ConfidenceLib, ConfidenceLevel } from './confidence';
import { Environment } from './runtime/environment';
import { RuntimeError, LoopControlError, ReturnException } from './runtime/errors';
import { ModuleSystem, Module } from './module-system';
import {
  Value,
  NumberValue,
  StringValue,
  BooleanValue,
  NullValue,
  ConfidenceValue,
  ArrayValue,
  ObjectValue,
  FunctionValue,
  PromiseValue,
} from './runtime/values';
import { LLMProvider, LLMRequest, LLMResponse, LLMStreamChunk, LLMOptions } from './llm-types';
import { createLLMBuiltin } from './runtime/builtins/llm';
import { createLLMStreamBuiltin } from './runtime/builtins/llm-stream';
import { registerArrayBuiltins } from './runtime/builtins/arrays';
import { registerConsoleBuiltins } from './runtime/builtins/console';
import { registerConfidenceBuiltins } from './runtime/builtins/confidence';
import { registerCollectionBuiltins } from './runtime/builtins/collections';
import { registerAsyncBuiltins } from './runtime/builtins/async';

interface PropertyAccessOptions {
  nullishReturnsNull?: boolean;
  missingReturnsNull?: boolean;
  forceConfidenceResult?: boolean;
  wrapNullishResult?: boolean;
  wrapMissingResult?: boolean;
  fallbackToNullOnUnsupported?: boolean;
}

export class Interpreter {
  public environment: Environment;
  private llmProviders = new Map<string, LLMProvider>();
  private defaultLLMProvider?: string;
  private contextStack: string[] = [];

  constructor() {
    this.environment = new Environment();
    this.setupBuiltins();
  }

  private setupBuiltins(): void {
    const registerValue = (name: string, value: Value) => this.environment.define(name, value);
    this.environment.define('llm', new FunctionValue('llm', createLLMBuiltin((providerName?: string) => this.getLLMProvider(providerName))));
    this.environment.define('stream_llm', new FunctionValue('stream_llm', createLLMStreamBuiltin((providerName?: string) => this.getLLMProvider(providerName))));
    registerArrayBuiltins((name, fn) => registerValue(name, fn));
    registerConsoleBuiltins(registerValue);
    registerConfidenceBuiltins((name, fn) => registerValue(name, fn));
    registerCollectionBuiltins(registerValue);
    registerAsyncBuiltins(registerValue);

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

  getLLMProvider(name?: string): LLMProvider | undefined {
    if (name) {
      return this.llmProviders.get(name);
    }
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
      case 'ConfidentTernaryExpression':
        return this.interpretConfidentTernaryExpression(node as ConfidentTernaryExpression);
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
      case 'MatchExpression':
        return this.interpretMatchExpression(node as MatchExpression);
      case 'AssignmentExpression':
        return this.interpretAssignmentExpression(node as AssignmentExpression);
      case 'AwaitExpression':
        return this.interpretAwaitExpression(node as AwaitExpression);
      case 'IfStatement':
        return this.interpretIfStatement(node as IfStatement);
      case 'UncertainIfStatement':
        return this.interpretUncertainIfStatement(node as UncertainIfStatement);
      case 'BlockStatement':
        return this.interpretBlockStatement(node as BlockStatement);
      case 'ContextStatement':
        return this.interpretContextStatement(node as ContextStatement);
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
      case 'FunctionDeclaration':
        return this.interpretFunctionDeclaration(node as FunctionDeclaration);
      case 'ReturnStatement':
        throw await this.interpretReturnStatement(node as ReturnStatement);
      case 'VariableDeclaration':
        return this.interpretVariableDeclaration(node as VariableDeclaration);
      case 'ImportStatement':
        return this.interpretImportStatement(node as ImportStatement);
      case 'ExportStatement':
        return this.interpretExportStatement(node as ExportStatement);
      case 'TryStatement':
        return this.interpretTryStatement(node as TryStatement);
      case 'AgentDeclaration':
        return this.interpretAgentDeclaration(node as AgentDeclaration);
      default:
        throw new RuntimeError(`Unknown node type: ${(node as any).type}`, node);
    }
  }

  private async interpretProgram(program: Program): Promise<Value> {
    let result: Value = new NumberValue(0); // Default return value

    // Hoist let/const declarations to enforce TDZ
    this.predeclareStatements(program.statements);

    // First pass: process imports (they need to be available before any code runs)
    for (const statement of program.statements) {
      if (statement.type === 'ImportStatement') {
        await this.interpret(statement);
      }
    }

    // Second pass: hoist function declarations
    for (const statement of program.statements) {
      if (statement instanceof FunctionDeclaration) {
        await this.interpretFunctionDeclaration(statement);
      }
    }

    // Third pass: execute all statements
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


  private async interpretIdentifier(node: IdentifierExpression): Promise<Value> {
    try {
      return this.environment.get(node.name);
    } catch (error) {
      throw new RuntimeError(`Undefined variable: ${node.name}`, node, node.location);
    }
  }

  private async interpretBinaryExpression(node: BinaryExpression): Promise<Value> {
    if (node.operator === '.' || node.operator === '~.') {
      if (!(node.right instanceof IdentifierExpression)) {
        throw new RuntimeError('Property access requires identifier on the right-hand side', node);
      }
      const left = await this.interpret(node.left);
      const options = node.operator === '~.'
        ? { nullishReturnsNull: true, missingReturnsNull: true, forceConfidenceResult: true }
        : {};
      return this.resolvePropertyAccess(left, node.right.name, node, options);
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
    // Ensure right is a Value for all other operators
    if (!(right instanceof NumberValue || right instanceof StringValue || right instanceof BooleanValue || 
          right instanceof ConfidenceValue || right instanceof FunctionValue || 
          right instanceof ArrayValue || right instanceof ObjectValue || right instanceof NullValue)) {
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
        return new BooleanValue(this.looseEquals(left, right));

      case '!=':
        return new BooleanValue(!this.looseEquals(left, right));

      case '===':
        return new BooleanValue(left.equals(right));

      case '!==':
        return new BooleanValue(!left.equals(right));

      case '&&':
      case '||':
        // These are handled in interpretBinaryExpression for short-circuit evaluation
        throw new RuntimeError('Logical operators should be handled in interpretBinaryExpression', node);

      case '??':
        // Nullish coalescing - return right if left is null
        if (left instanceof NullValue) {
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
              return new BooleanValue(valueToCheck instanceof NullValue);
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
      defaultValue = new NullValue();
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
          return new StringValue('unknown');
        }
        return new StringValue('unknown');

      default:
        throw new RuntimeError(`Unknown unary operator: ${node.operator}`, node);
    }
  }

  private async interpretCallExpression(node: CallExpression): Promise<Value> {
    const callee = await this.interpret(node.callee);

    // Handle ConfidenceValue wrapping a function
    let functionValue: FunctionValue;
    let functionConfidence: ConfidenceLib | undefined;
    
    if (callee instanceof ConfidenceValue && callee.value instanceof FunctionValue) {
      functionValue = callee.value;
      functionConfidence = callee.confidence;
    } else if (callee instanceof FunctionValue) {
      functionValue = callee;
    } else {
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

    const result = await functionValue.value(args);
    
    // If the function had confidence, apply it to the result
    if (functionConfidence) {
      // If result already has confidence, combine them
      if (result instanceof ConfidenceValue) {
        const combinedConfidence = result.confidence.value * functionConfidence.value;
        return new ConfidenceValue(result.value, new ConfidenceLib(combinedConfidence));
      } else {
        return new ConfidenceValue(result, functionConfidence);
      }
    }
    
    return result;
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

  private async interpretConfidentTernaryExpression(node: ConfidentTernaryExpression): Promise<Value> {
    const condition = await this.interpret(node.condition);
    
    // Extract confidence from condition
    let conditionConfidence = new ConfidenceLib(1.0);
    let conditionValue = condition;
    
    if (condition instanceof ConfidenceValue) {
      conditionConfidence = condition.confidence;
      conditionValue = condition.value;
    }
    
    // Select branch based on condition
    const selectedBranch = conditionValue.isTruthy() ? node.trueBranch : node.falseBranch;
    const branchResult = await this.interpret(selectedBranch);
    
    // Extract confidence from branch result
    let branchConfidence = new ConfidenceLib(1.0);
    let branchValue = branchResult;
    
    if (branchResult instanceof ConfidenceValue) {
      branchConfidence = branchResult.confidence;
      branchValue = branchResult.value;
    }
    
    // Combine confidences (multiply them)
    const combinedConfidence = new ConfidenceLib(
      conditionConfidence.value * branchConfidence.value
    );
    
    // Return result with combined confidence
    return new ConfidenceValue(branchValue, combinedConfidence);
  }

  private async interpretArrayLiteral(node: ArrayLiteral): Promise<Value> {
    const elements: Value[] = [];
    for (const elem of node.elements) {
      if (elem === null) {
        // Hole in array - this is handled during destructuring
        elements.push(new NullValue());
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
    return this.resolvePropertyAccess(object, node.property, node);
  }

  private resolvePropertyAccess(
    target: Value,
    property: string,
    node: ASTNode,
    options: PropertyAccessOptions = {}
  ): Value {
    const {
      nullishReturnsNull = false,
      missingReturnsNull = false,
      forceConfidenceResult = false,
      wrapNullishResult = true,
      wrapMissingResult = true,
      fallbackToNullOnUnsupported = false,
    } = options;

    const targetIsConfident = target instanceof ConfidenceValue;
    const activeConfidence = targetIsConfident
      ? target.confidence
      : forceConfidenceResult
        ? new ConfidenceLib(1.0)
        : undefined;
    const wrapConfidence = !!activeConfidence;
    const baseValue = targetIsConfident ? target.value : target;
    const wrapValue = (value: Value): Value => {
      if (!wrapConfidence) {
        return value;
      }
      if (value instanceof ConfidenceValue) {
        if (activeConfidence) {
          return new ConfidenceValue(value.value, activeConfidence.multiply(value.confidence));
        }
        return value;
      }
      return new ConfidenceValue(value, activeConfidence ?? new ConfidenceLib(1.0));
    };
    const maybeWrap = (value: Value): Value => (wrapConfidence ? wrapValue(value) : value);

    const handleNullish = (): Value => {
      if (nullishReturnsNull) {
        const result = new NullValue();
        return wrapConfidence && wrapNullishResult ? wrapValue(result) : result;
      }
      throw new RuntimeError(`Cannot access property '${property}' on ${baseValue.type}`, node);
    };

    const handleMissing = (): Value => {
      if (missingReturnsNull) {
        const result = new NullValue();
        return wrapConfidence && wrapMissingResult ? wrapValue(result) : result;
      }
      throw new RuntimeError(`Property '${property}' does not exist`, node);
    };

    if (baseValue instanceof NullValue) {
      return handleNullish();
    }

    if (baseValue instanceof ArrayValue) {
      const wrapArrayResults = wrapConfidence || forceConfidenceResult;
      return this.resolveArrayProperty(baseValue, property, node, maybeWrap, handleMissing, wrapArrayResults);
    }

    if (baseValue instanceof StringValue) {
      if (property === 'length') {
        return maybeWrap(new NumberValue(baseValue.value.length));
      }
      return handleMissing();
    }

    if (baseValue instanceof ObjectValue) {
      const value = baseValue.properties.get(property);
      if (!value) {
        return handleMissing();
      }
      return maybeWrap(value);
    }

    if (fallbackToNullOnUnsupported) {
      const result = new NullValue();
      return wrapConfidence && wrapMissingResult ? wrapValue(result) : result;
    }

    throw new RuntimeError(`Cannot access property '${property}' on ${baseValue.type}`, node);
  }

  private resolveArrayProperty(
    arrayValue: ArrayValue,
    property: string,
    node: ASTNode,
    wrapValue: (value: Value) => Value,
    handleMissing: () => Value,
    wrapResults: boolean
  ): Value {
    const wrapIfNeeded = (value: Value): Value => (wrapResults ? wrapValue(value) : value);

    switch (property) {
      case 'length':
        return wrapIfNeeded(new NumberValue(arrayValue.elements.length));

      case 'map':
        return wrapIfNeeded(new FunctionValue('map', async (args: Value[]) => {
          if (args.length !== 1) {
            throw new RuntimeError('Array.map() requires exactly 1 argument: function', node);
          }
          const fn = args[0];
          if (!(fn instanceof FunctionValue)) {
            throw new RuntimeError('Argument to map() must be a function', node);
          }

          const results: Value[] = [];
          for (const element of arrayValue.elements) {
            const result = await fn.value([element]);
            results.push(result);
          }
          return new ArrayValue(results);
        }));

      case 'filter':
        return wrapIfNeeded(new FunctionValue('filter', async (args: Value[]) => {
          if (args.length !== 1) {
            throw new RuntimeError('Array.filter() requires exactly 1 argument: predicate', node);
          }
          const predicate = args[0];
          if (!(predicate instanceof FunctionValue)) {
            throw new RuntimeError('Argument to filter() must be a function', node);
          }

          const results: Value[] = [];
          for (const element of arrayValue.elements) {
            const predicateResult = await predicate.value([element]);
            if (predicateResult.isTruthy()) {
              results.push(element);
            }
          }
          return new ArrayValue(results);
        }));

      case 'reduce':
        return wrapIfNeeded(new FunctionValue('reduce', async (args: Value[]) => {
          if (args.length < 1 || args.length > 2) {
            throw new RuntimeError('Array.reduce() requires 1 or 2 arguments: reducer and optional initial value', node);
          }
          const reducer = args[0];
          const initialValue = args.length === 2 ? args[1] : undefined;

          if (!(reducer instanceof FunctionValue)) {
            throw new RuntimeError('First argument to reduce() must be a function', node);
          }

          if (arrayValue.elements.length === 0 && initialValue === undefined) {
            throw new RuntimeError('reduce() of empty array with no initial value', node);
          }

          let accumulator: Value;
          let startIndex: number;

          if (initialValue !== undefined) {
            accumulator = initialValue;
            startIndex = 0;
          } else {
            accumulator = arrayValue.elements[0];
            startIndex = 1;
          }

          for (let i = startIndex; i < arrayValue.elements.length; i++) {
            const callArgs = [accumulator, arrayValue.elements[i]];
            if (reducer.arity === 3) {
              callArgs.push(new NumberValue(i));
            }
            accumulator = await reducer.value(callArgs);
          }

          return accumulator;
        }));

      case 'push':
        return wrapIfNeeded(new FunctionValue('push', async (args: Value[]) => {
          if (args.length === 0) {
            throw new RuntimeError('Array.push() requires at least 1 argument', node);
          }
          const newElements = [...arrayValue.elements, ...args];
          return new ArrayValue(newElements);
        }));

      case 'forEach':
        return wrapIfNeeded(new FunctionValue('forEach', async (args: Value[]) => {
          if (args.length !== 1) {
            throw new RuntimeError('Array.forEach() requires exactly 1 argument: function', node);
          }
          const fn = args[0];
          if (!(fn instanceof FunctionValue)) {
            throw new RuntimeError('Argument to forEach() must be a function', node);
          }

          for (let i = 0; i < arrayValue.elements.length; i++) {
            const callArgs = [arrayValue.elements[i]];
            if (fn.arity === 2) {
              callArgs.push(new NumberValue(i));
            }
            await fn.value(callArgs);
          }
          return new NullValue();
        }));

      case 'join':
        return wrapIfNeeded(new FunctionValue('join', async (args: Value[]) => {
          if (args.length > 1) {
            throw new RuntimeError('Array.join() requires 0 or 1 argument', node);
          }

          let separator = ',';
          if (args.length === 1) {
            if (!(args[0] instanceof StringValue)) {
              throw new RuntimeError('Array.join() separator must be a string', node);
            }
            separator = args[0].value;
          }

          const strings = arrayValue.elements.map(el => {
            if (el instanceof StringValue) {
              return el.value;
            } else if (el instanceof NumberValue) {
              return el.value.toString();
            } else if (el instanceof BooleanValue) {
              return el.value.toString();
            } else if (el instanceof NullValue) {
              return '';
            } else if (el instanceof NullValue) {
              return '';
            } else {
              return el.toString();
            }
          });

          return new StringValue(strings.join(separator));
        }));

      default:
        return handleMissing();
    }
  }

  private async interpretOptionalChainAccess(node: OptionalChainAccess): Promise<Value> {
    const object = await this.interpret(node.object);
    return this.resolvePropertyAccess(object, node.property, node, {
      nullishReturnsNull: true,
      missingReturnsNull: true,
      wrapNullishResult: false,
      wrapMissingResult: false,
      fallbackToNullOnUnsupported: true,
    });
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
              await this.destructureArray(param, arg, undefined, true, true);
            } else {
              await this.destructureObject(param, arg, undefined, true, true);
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
              await this.destructureArray(node.restParameter, restArray, undefined, true, true);
            } else if (node.restParameter instanceof ObjectPattern) {
              await this.destructureObject(node.restParameter, restArray, undefined, true, true);
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
        let result: Value;
        if (node.body.type === 'BlockStatement') {
          // Handle block statement body with return statement support
          try {
            result = new NumberValue(0); // Default return value
            for (const statement of (node.body as BlockStatement).statements) {
              result = await this.interpret(statement);
            }
          } catch (error) {
            if (error instanceof ReturnException) {
              result = error.value || new NumberValue(0);
            } else {
              throw error;
            }
          }
        } else {
          // Handle expression body (current behavior)
          result = await this.interpret(node.body);
        }
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
  
  private async interpretAwaitExpression(node: AwaitExpression): Promise<Value> {
    const expr = await this.interpret(node.expression);
    
    // If the expression evaluates to a PromiseValue, wait for it
    if (expr instanceof PromiseValue) {
      return await expr.value;
    }
    
    // Non-promise values are returned as-is (matching JavaScript behavior)
    return expr;
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

  private async interpretMatchExpression(node: MatchExpression): Promise<Value> {
    const value = await this.interpret(node.value);

    for (const arm of node.arms) {
      const previousEnv = this.environment;
      this.environment = new Environment(previousEnv);

      try {
        let globalThreshold: number | undefined;
        if (arm.confidenceThreshold) {
          const thresholdValue = await this.interpret(arm.confidenceThreshold);
          if (!(thresholdValue instanceof NumberValue)) {
            throw new RuntimeError('Confidence threshold must be a number', arm.confidenceThreshold);
          }
          globalThreshold = thresholdValue.value;
        }

        const matched = await this.matchPattern(arm.pattern, value, globalThreshold);
        if (!matched) {
          continue;
        }

        if (arm.guard) {
          const guardValue = await this.interpret(arm.guard);
          if (!guardValue.isTruthy()) {
            continue;
          }
        }

        if (arm.body instanceof BlockStatement) {
          return await this.interpretBlockStatement(arm.body);
        }
        return await this.interpret(arm.body);
      } finally {
        this.environment = previousEnv;
      }
    }

    return new NullValue();
  }
  
  private async destructureArray(pattern: ArrayPattern, value: Value, globalThreshold?: number, isMutable: boolean = true, isDeclared: boolean = false): Promise<void> {
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
      const arrayValue = i < array.length ? array[i] : new NullValue();
      
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
        // Assign null if confidence is too low
        if (element instanceof IdentifierExpression) {
          this.assignIdentifier(element.name, new NullValue(), isMutable, isDeclared);
        } else if (element instanceof ArrayPattern) {
          await this.destructureArray(element, new ArrayValue([]), globalThreshold, isMutable, isDeclared);
        } else if (element instanceof ObjectPattern) {
          await this.destructureObject(element, new ObjectValue(new Map()), globalThreshold, isMutable, isDeclared);
        }
      } else {
        if (element instanceof IdentifierExpression) {
          this.assignIdentifier(element.name, arrayValue, isMutable, isDeclared);
        } else if (element instanceof ArrayPattern) {
          await this.destructureArray(element, arrayValue, globalThreshold, isMutable, isDeclared);
        } else if (element instanceof ObjectPattern) {
          await this.destructureObject(element, arrayValue, globalThreshold, isMutable, isDeclared);
        } else {
          throw new RuntimeError('Invalid destructuring pattern', pattern);
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
      
      this.assignIdentifier(
        restElement.argument.name,
        new ArrayValue(restArray),
        isMutable,
        isDeclared
      );
    }
  }
  
  private meetsConfidenceThreshold(value: Value, threshold: number): boolean {
    if (value instanceof ConfidenceValue) {
      return value.confidence.value >= threshold;
    }
    // Non-confident values are treated as having confidence 1.0
    return 1.0 >= threshold;
  }

  private assignIdentifier(name: string, value: Value, isMutable: boolean, isDeclared: boolean): void {
    if (isDeclared) {
      this.environment.define(name, value, isMutable, true);
      return;
    }

    if (!this.environment.has(name)) {
      throw new RuntimeError(`Undefined variable: ${name}`);
    }
    this.environment.set(name, value);
  }
  
  private async destructureObject(pattern: ObjectPattern, value: Value, globalThreshold?: number, isMutable: boolean = true, isDeclared: boolean = false): Promise<void> {
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
        assignValue = new NullValue();
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
        // Assign null if confidence is too low
        if (prop.value instanceof IdentifierExpression) {
          this.assignIdentifier(prop.value.name, new NullValue(), isMutable, isDeclared);
        } else if (prop.value instanceof ArrayPattern) {
          await this.destructureArray(prop.value, new ArrayValue([]), globalThreshold, isMutable, isDeclared);
        } else if (prop.value instanceof ObjectPattern) {
          await this.destructureObject(prop.value, new ObjectValue(new Map()), globalThreshold, isMutable, isDeclared);
        }
      } else {
        if (prop.value instanceof IdentifierExpression) {
          this.assignIdentifier(prop.value.name, assignValue, isMutable, isDeclared);
        } else if (prop.value instanceof ArrayPattern) {
          // If this property has a confidence threshold, use it as the global threshold for the nested pattern
          const nestedThreshold = prop.confidenceThreshold ? 
            (await this.interpret(prop.confidenceThreshold) as NumberValue).value : 
            globalThreshold;
          await this.destructureArray(prop.value, assignValue, nestedThreshold, isMutable, isDeclared);
        } else if (prop.value instanceof ObjectPattern) {
          // If this property has a confidence threshold, use it as the global threshold for the nested pattern
          const nestedThreshold = prop.confidenceThreshold ? 
            (await this.interpret(prop.confidenceThreshold) as NumberValue).value : 
            globalThreshold;
          await this.destructureObject(prop.value, assignValue, nestedThreshold, isMutable, isDeclared);
        } else {
          throw new RuntimeError('Invalid destructuring pattern', pattern);
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
      this.assignIdentifier(
        pattern.rest.argument.name,
        new ObjectValue(restObj),
        isMutable,
        isDeclared
      );
    }
  }

  private async matchPattern(pattern: Expression, value: Value, globalThreshold?: number): Promise<boolean> {
    if (globalThreshold !== undefined && !this.meetsConfidenceThreshold(value, globalThreshold)) {
      return false;
    }

    const matchValue = value instanceof ConfidenceValue ? value.value : value;

    if (pattern instanceof IdentifierExpression) {
      if (pattern.name === '_') {
        return true;
      }
      this.environment.define(pattern.name, value, true, true);
      return true;
    }

    if (pattern instanceof NumberLiteral) {
      return matchValue instanceof NumberValue && matchValue.value === pattern.value;
    }

    if (pattern instanceof StringLiteral) {
      return matchValue instanceof StringValue && matchValue.value === pattern.value;
    }

    if (pattern instanceof BooleanLiteral) {
      return matchValue instanceof BooleanValue && matchValue.value === pattern.value;
    }

    if (pattern instanceof NullLiteral) {
      return matchValue instanceof NullValue;
    }

    if (pattern instanceof ArrayPattern) {
      return this.matchArrayPattern(pattern, matchValue, globalThreshold);
    }

    if (pattern instanceof ObjectPattern) {
      return this.matchObjectPattern(pattern, matchValue, globalThreshold);
    }

    throw new RuntimeError('Invalid match pattern', pattern);
  }

  private async matchArrayPattern(pattern: ArrayPattern, value: Value, globalThreshold?: number): Promise<boolean> {
    if (!(value instanceof ArrayValue)) {
      return false;
    }

    const array = value.value;
    let restStartIndex = pattern.elements.length;

    for (let i = 0; i < pattern.elements.length; i++) {
      if (pattern.elements[i] instanceof RestElement) {
        restStartIndex = i;
        break;
      }
    }

    if (array.length < restStartIndex) {
      return false;
    }
    if (restStartIndex === pattern.elements.length && array.length !== pattern.elements.length) {
      return false;
    }

    for (let i = 0; i < restStartIndex; i++) {
      const elementPattern = pattern.elements[i];
      if (elementPattern === null) {
        continue;
      }

      if (i >= array.length) {
        return false;
      }

      let threshold = globalThreshold;
      if (pattern.elementThresholds && pattern.elementThresholds[i]) {
        const thresholdValue = await this.interpret(pattern.elementThresholds[i]!);
        if (!(thresholdValue instanceof NumberValue)) {
          throw new RuntimeError('Element confidence threshold must be a number', pattern);
        }
        threshold = thresholdValue.value;
      }

      const matched = await this.matchPattern(elementPattern as Expression, array[i], threshold);
      if (!matched) {
        return false;
      }
    }

    if (restStartIndex < pattern.elements.length) {
      const restElement = pattern.elements[restStartIndex] as RestElement;
      const restValues = array.slice(restStartIndex);
      if (restElement.argument.name !== '_') {
        this.environment.define(restElement.argument.name, new ArrayValue(restValues), true, true);
      }
    }

    return true;
  }

  private async matchObjectPattern(pattern: ObjectPattern, value: Value, globalThreshold?: number): Promise<boolean> {
    if (!(value instanceof ObjectValue)) {
      return false;
    }

    const obj = value.value;
    const extractedKeys = new Set<string>();

    for (const prop of pattern.properties) {
      const objValue = obj.get(prop.key);
      if (objValue === undefined) {
        return false;
      }

      extractedKeys.add(prop.key);

      let threshold = globalThreshold;
      if (prop.confidenceThreshold) {
        const thresholdValue = await this.interpret(prop.confidenceThreshold);
        if (!(thresholdValue instanceof NumberValue)) {
          throw new RuntimeError('Property confidence threshold must be a number', pattern);
        }
        threshold = thresholdValue.value;
      }

      const matched = await this.matchPattern(prop.value, objValue, threshold);
      if (!matched) {
        return false;
      }
    }

    if (pattern.rest) {
      const restObj = new Map<string, Value>();
      for (const [key, val] of obj.entries()) {
        if (!extractedKeys.has(key)) {
          restObj.set(key, val);
        }
      }
      if (pattern.rest.argument.name !== '_') {
        this.environment.define(pattern.rest.argument.name, new ObjectValue(restObj), true, true);
      }
    }

    return true;
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
    } else if (level === ConfidenceLevel.LOW && node.branches.low) {
      return await this.interpret(node.branches.low);
    } else if (node.branches.default) {
      return await this.interpret(node.branches.default);
    }

    return new NumberValue(0); // Default return
  }

  private async interpretTryStatement(node: TryStatement): Promise<Value> {
    let result: Value = new NullValue();
    let errorValue: Value | null = null;

    try {
      // Execute try block
      result = await this.interpretBlockStatement(node.tryBlock);
    } catch (error) {
      // Capture the error
      if (error instanceof RuntimeError) {
        errorValue = new StringValue(error.message);
      } else if (error instanceof Error) {
        errorValue = new StringValue(error.message);
      } else {
        errorValue = new StringValue(String(error));
      }

      // Execute catch block if present
      if (node.catchBlock) {
        // Create new environment for catch block with error variable
        const catchEnv = new Environment(this.environment);
        const previousEnv = this.environment;
        this.environment = catchEnv;

        try {
          // Bind error variable if specified
          if (node.errorVariable) {
            this.environment.define(node.errorVariable, errorValue);
          }

          result = await this.interpretBlockStatement(node.catchBlock);
        } finally {
          this.environment = previousEnv;
        }
      } else {
        // Re-throw if no catch block
        throw error;
      }
    } finally {
      // Execute finally block if present
      if (node.finallyBlock) {
        await this.interpretBlockStatement(node.finallyBlock);
      }
    }

    return result;
  }


  private async interpretBlockStatement(node: BlockStatement): Promise<Value> {
    const previousEnv = this.environment;
    if (node.createScope) {
      this.environment = new Environment(previousEnv);
    }

    try {
      let result: Value = new NumberValue(0);

      if (node.createScope) {
        this.predeclareStatements(node.statements);
      }
      
      for (const statement of node.statements) {
        result = await this.interpret(statement);
      }
      
      return result;
    } finally {
      if (node.createScope) {
        this.environment = previousEnv;
      }
    }
  }

  private async interpretContextStatement(node: ContextStatement): Promise<Value> {
    this.contextStack.push(node.contextName);
    try {
      return await this.interpretBlockStatement(node.body);
    } finally {
      this.contextStack.pop();
    }
  }

  private async interpretExpressionStatement(node: ExpressionStatement): Promise<Value> {
    return await this.interpret(node.expression);
  }

  private async interpretFunctionDeclaration(node: FunctionDeclaration): Promise<Value> {
    // Create a function value that captures the current environment
    const closureEnv = this.environment;
    const functionValue = new FunctionValue(
      node.name,
      async (args: Value[]): Promise<Value> => {
        // Create new scope for function execution with captured environment
        const functionEnv = new Environment(closureEnv);
        const previousEnv = this.environment;
        this.environment = functionEnv;

        try {
          // Bind parameters to arguments
          await this.bindParameters(node.parameters, args, node.restParameter);

          // Execute function body and catch return statements
          try {
            let result: Value = new NumberValue(0); // Default return value
            
            // Execute all statements in the function body
            for (const statement of node.body.statements) {
              result = await this.interpret(statement);
            }
            
            // If no explicit return, return the last expression result or 0
            return result;
          } catch (error) {
            if (error instanceof ReturnException) {
              // Handle return statement
              return error.value || new NumberValue(0);
            }
            throw error; // Re-throw other errors
          }
        } finally {
          // Restore previous environment
          this.environment = previousEnv;
        }
      },
      node.parameters.length
    );

    // Apply confidence annotation if present
    let result: Value = functionValue;
    if (node.confidenceAnnotation) {
      const confidence = await this.interpret(node.confidenceAnnotation);
      if (confidence instanceof NumberValue) {
        result = new ConfidenceValue(functionValue, new ConfidenceLib(confidence.value));
      }
    }

    // Define the function in the current environment
    this.environment.define(node.name, result);

    return result;
  }

  private async interpretReturnStatement(node: ReturnStatement): Promise<ReturnException> {
    let value: Value = new NumberValue(0); // Default return value
    
    if (node.value) {
      value = await this.interpret(node.value);
    }
    
    return new ReturnException(value);
  }

  private async interpretVariableDeclaration(node: VariableDeclaration): Promise<Value> {
    const isMutable = node.kind === 'let';
    
    if (node.pattern) {
      // Destructuring declaration: const [a, b] = array or const {x, y} = obj
      if (!node.initializer) {
        throw new RuntimeError(`${node.kind} destructuring declaration requires an initializer`);
      }
      
      // Evaluate the initializer
      const value = await this.interpret(node.initializer);
      
      // Call destructuring with proper const/let semantics
      if (node.pattern instanceof ArrayPattern) {
        await this.destructureArray(node.pattern, value, undefined, isMutable, true);
      } else if (node.pattern instanceof ObjectPattern) {
        await this.destructureObject(node.pattern, value, undefined, isMutable, true);
      }
    } else {
      // Regular declaration: const/let name = value
      let value: Value = new NullValue(); // Default value for let without initializer
      
      if (node.initializer) {
        value = await this.interpret(node.initializer);
      }
      
      // Define the variable with mutability info
      this.environment.define(node.identifier, value, isMutable, true);
    }
    
    return new NumberValue(0); // Variable declarations return 0
  }

  private predeclareStatements(statements: Statement[]): void {
    for (const statement of statements) {
      if (statement instanceof VariableDeclaration) {
        const isMutable = statement.kind === 'let';
        if (statement.pattern) {
          const names: string[] = [];
          this.collectPatternIdentifiers(statement.pattern, names);
          for (const name of names) {
            this.environment.declare(name, isMutable);
          }
        } else {
          this.environment.declare(statement.identifier, isMutable);
        }
      }
    }
  }

  private collectPatternIdentifiers(pattern: ArrayPattern | ObjectPattern, names: string[]): void {
    if (pattern instanceof ArrayPattern) {
      for (const element of pattern.elements) {
        if (!element) continue;
        if (element instanceof IdentifierExpression) {
          names.push(element.name);
        } else if (element instanceof RestElement) {
          names.push(element.argument.name);
        } else if (element instanceof ArrayPattern || element instanceof ObjectPattern) {
          this.collectPatternIdentifiers(element, names);
        }
      }
      return;
    }

    for (const prop of pattern.properties) {
      if (prop.value instanceof IdentifierExpression) {
        names.push(prop.value.name);
      } else if (prop.value instanceof ArrayPattern || prop.value instanceof ObjectPattern) {
        this.collectPatternIdentifiers(prop.value, names);
      }
    }
    if (pattern.rest) {
      names.push(pattern.rest.argument.name);
    }
  }

  private async interpretAgentDeclaration(node: AgentDeclaration): Promise<Value> {
    const properties = new Map<string, Value>();
    for (const [key, expression] of node.config.entries()) {
      const value = await this.interpret(expression);
      properties.set(key, value);
    }

    const agentValue = new ObjectValue(properties);
    this.environment.define(node.name, agentValue);
    return agentValue;
  }

  private async interpretImportStatement(node: ImportStatement): Promise<Value> {
    // Check if module system is available
    const moduleSystem = (this as any).__moduleSystem;
    if (!moduleSystem) {
      throw new RuntimeError('Import statements require a module system', node);
    }
    
    // Delegate to module system, passing the interpreter (this)
    await moduleSystem.executeImport(node, this);
    
    return new NumberValue(0); // Import statements return 0
  }

  private async interpretExportStatement(node: ExportStatement): Promise<Value> {
    // Check if module system is available
    const moduleSystem = (this as any).__moduleSystem;
    if (!moduleSystem) {
      throw new RuntimeError('Export statements require a module system', node);
    }
    
    // Handle direct export assignments (export result = calculate())
    // This is already handled by the module system, so we can remove this duplicate handling
    
    // Delegate to module system for other export types
    await moduleSystem.executeExport(node, this);
    
    return new NumberValue(0); // Export statements return 0
  }


  private async bindParameters(
    parameters: any[], 
    args: Value[], 
    restParameter?: string | ArrayPattern | ObjectPattern
  ): Promise<void> {
    // Handle rest parameters
    if (restParameter) {
      // With rest parameter, we need at least as many args as regular params
      if (args.length < parameters.length) {
        throw new RuntimeError(`Function expects at least ${parameters.length} arguments, got ${args.length}`);
      }
    } else {
      // Without rest parameter, exact match required
      if (args.length !== parameters.length) {
        throw new RuntimeError(`Function expects ${parameters.length} arguments, got ${args.length}`);
      }
    }
    
    // Bind regular parameters to arguments
    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      const arg = args[i];
      
      if (typeof param === 'string') {
        // Simple parameter
        this.environment.define(param, arg);
      } else if (param instanceof ArrayPattern || param instanceof ObjectPattern) {
        // Destructuring parameter
        if (param instanceof ArrayPattern) {
          await this.destructureArray(param, arg, undefined, true, true);
        } else {
          await this.destructureObject(param, arg, undefined, true, true);
        }
      }
    }
    
    // Bind rest parameter if present
    if (restParameter) {
      const restArgs = args.slice(parameters.length);
      if (typeof restParameter === 'string') {
        this.environment.define(restParameter, new ArrayValue(restArgs));
      } else {
        // Rest parameter with destructuring pattern
        const restArray = new ArrayValue(restArgs);
        if (restParameter instanceof ArrayPattern) {
          await this.destructureArray(restParameter, restArray, undefined, true, true);
        } else {
          await this.destructureObject(restParameter, restArray, undefined, true, true);
        }
      }
    }
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

      let result: Value = new NullValue();

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
      let result: Value = new NullValue();

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
    let result: Value = new NullValue();

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
    let result: Value = new NullValue();

    while (true) {
      try {
        result = await this.interpret(node.body);
      } catch (error) {
        if (error instanceof LoopControlError) {
          if (error.type === 'break') {
            break;
          } else if (error.type === 'continue') {
            // Skip directly to condition check
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      const conditionValue = await this.interpret(node.condition);
      if (!conditionValue.isTruthy()) {
        break;
      }
    }

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

      let result: Value = new NullValue();
      
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
        } else if (level === ConfidenceLevel.LOW && node.branches.low) {
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
        } else if (node.branches.default) {
          // Execute default branch when no confidence level matches
          try {
            result = await this.interpret(node.branches.default);
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
        } else {
          // No matching branch and no default - exit the loop
          // This prevents infinite loops when confidence doesn't match any branch
          break;
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
    let result: Value = new NullValue();

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
      } else if (level === ConfidenceLevel.LOW && node.branches.low) {
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
      } else if (node.branches.default) {
        // Execute default branch when no confidence level matches
        try {
          result = await this.interpret(node.branches.default);
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
      } else {
        // No matching branch and no default - exit the loop
        // This prevents infinite loops when confidence doesn't match any branch
        break;
      }
    }

    return result;
  }

  private looseEquals(left: Value, right: Value): boolean {
    // Strict type match - use normal equals
    if (left.type === right.type) {
      return left.equals(right);
    }

    // Number comparisons with type coercion
    if (left instanceof NumberValue || right instanceof NumberValue) {
      const leftNum = this.toNumber(left);
      const rightNum = this.toNumber(right);
      if (leftNum !== null && rightNum !== null) {
        return leftNum === rightNum;
      }
    }

    // String comparisons with type coercion
    if (left instanceof StringValue || right instanceof StringValue) {
      // Special case: empty string == false
      if ((left instanceof StringValue && left.value === "" && right instanceof BooleanValue && !right.value) ||
          (right instanceof StringValue && right.value === "" && left instanceof BooleanValue && !left.value)) {
        return true;
      }
      return left.toString() === right.toString();
    }

    // Boolean comparisons
    if (left instanceof BooleanValue || right instanceof BooleanValue) {
      return left.isTruthy() === right.isTruthy();
    }

    return false;
  }

  private toNumber(value: Value): number | null {
    if (value instanceof NumberValue) {
      return value.value;
    }
    if (value instanceof StringValue) {
      const num = parseFloat(value.value);
      return isNaN(num) ? null : num;
    }
    if (value instanceof BooleanValue) {
      return value.value ? 1 : 0;
    }
    if (value instanceof NullValue) {
      return 0;
    }
    return null;
  }
}

export interface RuntimeOptions {
  moduleSystem?: ModuleSystem;
}

export interface ModuleInvalidationOptions {
  invalidateDependents?: boolean;
}

export interface RuntimeLLMCallOptions extends LLMOptions {
  provider?: string;
}

export interface RuntimeLLMStream {
  chunks: AsyncIterable<LLMStreamChunk>;
  response: Promise<LLMResponse>;
  cancel(reason?: unknown): void;
}

export class Runtime {
  private interpreter: Interpreter;
  private moduleSystem: ModuleSystem;

  constructor(options?: RuntimeOptions) {
    this.moduleSystem = options?.moduleSystem ?? new ModuleSystem();
    this.interpreter = new Interpreter();
    (this.interpreter as any).__runtime = this;
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

  getLLMProvider(name?: string): LLMProvider | undefined {
    return this.interpreter.getLLMProvider(name);
  }

  streamLLM(prompt: string, options?: RuntimeLLMCallOptions): RuntimeLLMStream {
    const provider = this.interpreter.getLLMProvider(options?.provider);
    if (!provider) {
      const providerName = options?.provider || this.interpreter.getDefaultLLMProviderName() || 'default';
      throw new RuntimeError(`LLM provider '${providerName}' not found`);
    }

    const requestOptions = this.normalizeLLMOptions(options);
    const request = new LLMRequest(prompt, requestOptions);

    if (provider.stream) {
      const session = provider.stream(request);
      return {
        chunks: session,
        response: session.response,
        cancel: (reason?: unknown) => session.cancel(reason),
      };
    }

    let cancelled = false;
    const responsePromise = (async () => {
      const response = await provider.complete(request);
      if (cancelled) {
        throw new RuntimeError('LLM stream cancelled');
      }
      return response;
    })();

    const generator = (async function* (): AsyncGenerator<LLMStreamChunk> {
      const response = await responsePromise;
      if (cancelled) {
        return;
      }
      yield { type: 'text', content: response.content };
    })();

    return {
      chunks: generator,
      response: responsePromise,
      cancel: () => {
        cancelled = true;
      },
    };
  }

  getVariable(name: string): Value {
    return this.interpreter.environment.get(name);
  }

  getAllVariables(): Map<string, Value> {
    return this.interpreter.environment.getAllVariables();
  }

  defineVariable(name: string, value: Value): void {
    this.interpreter.environment.define(name, value);
  }

  createObjectValue(properties: any): Value {
    const map = new Map<string, Value>();
    for (const [key, val] of Object.entries(properties)) {
      map.set(key, val as Value);
    }
    return new ObjectValue(map);
  }

  async interpret(node: ASTNode): Promise<Value> {
    return await this.interpreter.interpret(node);
  }

  get environment(): Environment {
    return this.interpreter.environment;
  }

  getModuleSystem(): ModuleSystem {
    return this.moduleSystem;
  }

  invalidateModule(modulePath: string, options?: ModuleInvalidationOptions): void {
    const invalidateDependents = options?.invalidateDependents ?? true;
    this.moduleSystem.invalidateModule(modulePath, invalidateDependents);
  }

  async reloadModule(modulePath: string, options?: ModuleInvalidationOptions): Promise<Module> {
    this.invalidateModule(modulePath, options);
    return await this.moduleSystem.loadModule(modulePath, this);
  }

  private normalizeLLMOptions(options?: RuntimeLLMCallOptions): LLMOptions {
    if (!options) {
      return {};
    }
    const requestOptions: LLMOptions = {};
    if (options.maxTokens !== undefined) requestOptions.maxTokens = options.maxTokens;
    if (options.temperature !== undefined) requestOptions.temperature = options.temperature;
    if (options.topP !== undefined) requestOptions.topP = options.topP;
    if (options.timeout !== undefined) requestOptions.timeout = options.timeout;
    if (options.model !== undefined) requestOptions.model = options.model;
    if (options.structuredOutput !== undefined) requestOptions.structuredOutput = options.structuredOutput;
    if (options.includeReasoning !== undefined) requestOptions.includeReasoning = options.includeReasoning;
    if (options.confidenceExtractor !== undefined) requestOptions.confidenceExtractor = options.confidenceExtractor;
    return requestOptions;
  }
}

export function createRuntime(options?: RuntimeOptions): Runtime {
  return new Runtime(options);
}

export {
  Value,
  NumberValue,
  StringValue,
  BooleanValue,
  NullValue,
  ConfidenceValue,
  ArrayValue,
  ObjectValue,
  FunctionValue,
  PromiseValue,
} from './runtime/values';
export { Environment } from './runtime/environment';
export { RuntimeError, LoopControlError, ReturnException } from './runtime/errors';
