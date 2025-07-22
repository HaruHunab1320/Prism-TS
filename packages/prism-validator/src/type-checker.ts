import { ASTNode } from '@prism-lang/core';
import { TypeError, TypeCheckResult } from './types';

export interface TypeChecker {
  checkTypes(ast: ASTNode): TypeCheckResult;
}

type PrismType = 
  | 'number'
  | 'string'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'function'
  | 'array'
  | 'object'
  | 'confidence'
  | 'any'
  | 'unknown';

interface TypeInfo {
  type: PrismType;
  isConfident?: boolean;
  elementType?: PrismType;
  properties?: Record<string, TypeInfo>;
  paramTypes?: PrismType[];
  returnType?: PrismType;
}

export class TypeAnalyzer implements TypeChecker {
  private errors: TypeError[] = [];
  private typeEnvironment: Map<string, TypeInfo> = new Map();
  private scopeStack: Array<Map<string, TypeInfo>> = [];

  checkTypes(ast: ASTNode): TypeCheckResult {
    this.errors = [];
    this.typeEnvironment = new Map();
    this.scopeStack = [];

    this.initializeBuiltins();
    this.inferType(ast);

    return {
      valid: this.errors.length === 0,
      errors: this.errors
    };
  }

  private initializeBuiltins(): void {
    this.typeEnvironment.set('llm', {
      type: 'function',
      paramTypes: ['string'],
      returnType: 'confidence'
    });

    this.typeEnvironment.set('map', {
      type: 'function',
      paramTypes: ['array', 'function'],
      returnType: 'array'
    });

    this.typeEnvironment.set('filter', {
      type: 'function',
      paramTypes: ['array', 'function'],
      returnType: 'array'
    });

    this.typeEnvironment.set('reduce', {
      type: 'function',
      paramTypes: ['array', 'function', 'any'],
      returnType: 'any'
    });

    this.typeEnvironment.set('Math', {
      type: 'object',
      properties: {
        PI: { type: 'number' },
        E: { type: 'number' },
        random: { type: 'function', paramTypes: [], returnType: 'number' },
        floor: { type: 'function', paramTypes: ['number'], returnType: 'number' },
        ceil: { type: 'function', paramTypes: ['number'], returnType: 'number' },
        round: { type: 'function', paramTypes: ['number'], returnType: 'number' },
        sqrt: { type: 'function', paramTypes: ['number'], returnType: 'number' },
        pow: { type: 'function', paramTypes: ['number', 'number'], returnType: 'number' },
        min: { type: 'function', paramTypes: ['number', 'number'], returnType: 'number' },
        max: { type: 'function', paramTypes: ['number', 'number'], returnType: 'number' }
      }
    });

    this.typeEnvironment.set('print', {
      type: 'function',
      paramTypes: ['any'],
      returnType: 'undefined'
    });
  }

  private getLocation(node: any): { line: number; column: number } {
    return {
      line: node.location?.line || node.line || 1,
      column: node.location?.column || node.column || 1
    };
  }

  private pushScope(): void {
    this.scopeStack.push(new Map(this.typeEnvironment));
  }

  private popScope(): void {
    const prevScope = this.scopeStack.pop();
    if (prevScope) {
      this.typeEnvironment = prevScope;
    }
  }

  private setType(name: string, type: TypeInfo): void {
    this.typeEnvironment.set(name, type);
  }

  private getType(name: string): TypeInfo | undefined {
    return this.typeEnvironment.get(name);
  }

  private inferType(node: ASTNode | null): TypeInfo {
    if (!node) return { type: 'undefined' };

    const n = node as any;

    switch (n.type) {
      case 'Program':
        n.statements.forEach((stmt: any) => this.inferType(stmt));
        return { type: 'undefined' };

      case 'NumberLiteral':
        return { type: 'number' };

      case 'StringLiteral':
        return { type: 'string' };

      case 'BooleanLiteral':
        return { type: 'boolean' };

      case 'NullLiteral':
        return { type: 'null' };

      case 'UndefinedLiteral':
        return { type: 'undefined' };

      case 'IdentifierExpression':
        const identType = this.getType(n.name);
        if (!identType) {
          this.errors.push({
            ...this.getLocation(n),
            message: `Undefined variable: ${n.name}`,
            code: 'UNDEFINED_VARIABLE'
          });
          return { type: 'unknown' };
        }
        return identType;

      case 'ConfidenceExpression':
        const exprType = this.inferType(n.expression);
        return { ...exprType, type: 'confidence', isConfident: true };

      case 'UnaryExpression':
        return this.inferUnaryExpression(n);

      case 'BinaryExpression':
        return this.inferBinaryExpression(n);

      case 'AssignmentExpression':
        const rightType = this.inferType(n.value);
        if (n.identifier) {
          this.setType(n.identifier, rightType);
        }
        return rightType;

      case 'AssignmentStatement':
        const stmtRightType = this.inferType(n.value);
        if (n.identifier) {
          this.setType(n.identifier, stmtRightType);
        }
        return { type: 'undefined' };

      case 'ArrayLiteral':
        const elementTypes = n.elements.map((elem: any) => this.inferType(elem));
        const elementType = this.unifyTypes(elementTypes);
        return { type: 'array', elementType: elementType.type };

      case 'ObjectLiteral':
        const properties: Record<string, TypeInfo> = {};
        n.properties.forEach((prop: any) => {
          properties[prop.key] = this.inferType(prop.value);
        });
        return { type: 'object', properties };

      case 'PropertyAccess':
      case 'OptionalChainAccess':
        const objectType = this.inferType(n.object);
        if (objectType.type === 'object' && objectType.properties) {
          const propType = objectType.properties[n.property];
          if (!propType) {
            this.errors.push({
              ...this.getLocation(n),
              message: `Property '${n.property}' does not exist on object`,
              code: 'UNDEFINED_PROPERTY'
            });
            return { type: 'unknown' };
          }
          return propType;
        }
        return { type: 'any' };

      case 'IndexAccess':
        const arrType = this.inferType(n.object);
        this.inferType(n.index);
        if (arrType.type === 'array' && arrType.elementType) {
          return { type: arrType.elementType };
        }
        return { type: 'any' };

      case 'CallExpression':
        return this.inferCallExpression(n);

      case 'TernaryExpression':
        this.inferType(n.condition);
        const consequentType = this.inferType(n.thenExpression);
        const alternateType = this.inferType(n.elseExpression);
        return this.unifyTypes([consequentType, alternateType]);

      case 'BinaryExpression':
        return this.inferBinaryExpression(n);

      case 'FunctionExpression':
      case 'LambdaExpression':
        return this.inferFunction(n);

      case 'BlockStatement':
        this.pushScope();
        n.statements.forEach((stmt: any) => this.inferType(stmt));
        this.popScope();
        return { type: 'undefined' };

      case 'IfStatement':
        this.inferType(n.condition);
        this.inferType(n.thenStatement);
        if (n.elseStatement) {
          this.inferType(n.elseStatement);
        }
        return { type: 'undefined' };

      case 'UncertainIfStatement':
        const uncertainTestType = this.inferType(n.condition);
        if (!uncertainTestType.isConfident && uncertainTestType.type !== 'confidence') {
          this.errors.push({
            ...this.getLocation(n),
            message: 'Uncertain if statement requires a confidence value',
            code: 'UNCERTAIN_WITHOUT_CONFIDENCE',
            expectedType: 'confidence',
            actualType: uncertainTestType.type
          });
        }
        const branches = n.branches || {};
        if (branches.high) this.inferType(branches.high);
        if (branches.medium) this.inferType(branches.medium);
        if (branches.low) this.inferType(branches.low);
        if (branches.default) this.inferType(branches.default);
        return { type: 'undefined' };

      case 'ForLoop':
        if (n.init) this.inferType(n.init);
        if (n.condition) this.inferType(n.condition);
        if (n.update) this.inferType(n.update);
        this.inferType(n.body);
        return { type: 'undefined' };

      case 'ForInLoop':
        this.pushScope();
        this.setType(n.variable, { type: 'any' });
        if (n.index) {
          this.setType(n.index, { type: 'number' });
        }
        this.inferType(n.iterable);
        this.inferType(n.body);
        this.popScope();
        return { type: 'undefined' };

      case 'WhileLoop':
      case 'DoWhileLoop':
        this.inferType(n.condition);
        this.inferType(n.body);
        return { type: 'undefined' };

      case 'ExpressionStatement':
        this.inferType(n.expression);
        return { type: 'undefined' };

      case 'ContextStatement':
        this.pushScope();
        this.inferType(n.body);
        this.popScope();
        return { type: 'undefined' };

      case 'AgentDeclaration':
        return { type: 'undefined' };

      case 'InterpolatedString':
        n.expressions.forEach((expr: any) => this.inferType(expr));
        return { type: 'string' };

      case 'SpreadElement':
        this.inferType(n.expression);
        return { type: 'any' };

      case 'UncertainForLoop':
      case 'UncertainWhileLoop':
        if (n.condition) this.inferType(n.condition);
        if (n.body) this.inferType(n.body);
        const ubranches = n.branches || {};
        if (ubranches.high) this.inferType(ubranches.high);
        if (ubranches.medium) this.inferType(ubranches.medium);
        if (ubranches.low) this.inferType(ubranches.low);
        if (ubranches.default) this.inferType(ubranches.default);
        return { type: 'undefined' };

      case 'BreakStatement':
      case 'ContinueStatement':
        return { type: 'undefined' };

      case 'ArrayPattern':
      case 'ObjectPattern':
      case 'DestructuringAssignment':
        // Complex destructuring - simplified for now
        return { type: 'undefined' };

      default:
        return { type: 'any' };
    }
  }

  private inferUnaryExpression(node: any): TypeInfo {
    const argType = this.inferType(node.operand);

    switch (node.operator) {
      case '-':
      case '+':
        if (argType.type !== 'number' && argType.type !== 'confidence') {
          this.errors.push({
            ...this.getLocation(node),
            message: `Cannot apply ${node.operator} to type ${argType.type}`,
            code: 'INVALID_UNARY_OPERAND',
            expectedType: 'number',
            actualType: argType.type
          });
        }
        return argType;

      case '!':
        return { type: 'boolean' };

      case '~':
        if (argType.type === 'confidence' || argType.isConfident) {
          return { type: 'number' };
        }
        this.errors.push({
          ...this.getLocation(node),
          message: 'Confidence operator ~ can only be used on confidence values',
          code: 'INVALID_CONFIDENCE_OPERATOR',
          expectedType: 'confidence',
          actualType: argType.type
        });
        return { type: 'number' };

      case 'typeof':
        return { type: 'string' };

      default:
        return argType;
    }
  }

  private inferBinaryExpression(node: any): TypeInfo {
    const leftType = this.inferType(node.left);
    const rightType = this.inferType(node.right);

    const numericOps = ['+', '-', '*', '/', '%', '**'];
    const comparisonOps = ['<', '>', '<=', '>=', '==', '!=', '===', '!=='];
    const logicalOps = ['&&', '||'];
    const confidenceOps = ['~>', '~>=', '~<=', '~<', '~==', '~!=', '~+', '~-', '~*', '~/', '~%', '~**', '~&&', '~||', '~??', '~|>'];

    if (numericOps.includes(node.operator)) {
      if (node.operator === '+' && (leftType.type === 'string' || rightType.type === 'string')) {
        return { type: 'string' };
      }
      
      if (leftType.type !== 'number' && leftType.type !== 'confidence') {
        this.errors.push({
          ...this.getLocation(node),
          message: `Cannot apply ${node.operator} to type ${leftType.type}`,
          code: 'INVALID_BINARY_OPERAND',
          expectedType: 'number',
          actualType: leftType.type
        });
      }
      
      if (rightType.type !== 'number' && rightType.type !== 'confidence') {
        this.errors.push({
          ...this.getLocation(node),
          message: `Cannot apply ${node.operator} to type ${rightType.type}`,
          code: 'INVALID_BINARY_OPERAND',
          expectedType: 'number',
          actualType: rightType.type
        });
      }
      
      return leftType.isConfident || rightType.isConfident 
        ? { type: 'confidence', isConfident: true }
        : { type: 'number' };
    }

    if (comparisonOps.includes(node.operator)) {
      return { type: 'boolean' };
    }

    if (logicalOps.includes(node.operator)) {
      return { type: 'boolean' };
    }

    if (confidenceOps.includes(node.operator)) {
      if (!leftType.isConfident && leftType.type !== 'confidence') {
        this.errors.push({
          ...this.getLocation(node),
          message: `Left operand of ${node.operator} must be a confidence value`,
          code: 'CONFIDENCE_OPERATOR_WITHOUT_CONFIDENCE',
          expectedType: 'confidence',
          actualType: leftType.type
        });
      }
      
      const baseOp = node.operator.substring(1);
      if (numericOps.includes(baseOp)) {
        return { type: 'confidence', isConfident: true };
      } else if (comparisonOps.includes(baseOp) || logicalOps.includes(baseOp)) {
        return { type: 'boolean' };
      } else if (baseOp === '|>') {
        return rightType;
      }
    }

    if (node.operator === '@') {
      if (rightType.type !== 'number') {
        this.errors.push({
          ...this.getLocation(node),
          message: 'Confidence value must be a number',
          code: 'INVALID_CONFIDENCE_VALUE',
          expectedType: 'number',
          actualType: rightType.type
        });
      }
      return { type: 'confidence', isConfident: true };
    }

    if (node.operator === '??') {
      return this.unifyTypes([leftType, rightType]);
    }

    if (node.operator === '|>') {
      if (rightType.type !== 'function') {
        this.errors.push({
          ...this.getLocation(node),
          message: 'Right operand of pipeline operator must be a function',
          code: 'INVALID_PIPELINE_OPERAND',
          expectedType: 'function',
          actualType: rightType.type
        });
      }
      return rightType.returnType ? { type: rightType.returnType } : { type: 'any' };
    }

    if (node.operator === '..') {
      if (leftType.type !== 'number' || rightType.type !== 'number') {
        this.errors.push({
          ...this.getLocation(node),
          message: 'Range expressions require numeric operands',
          code: 'INVALID_RANGE_TYPE',
          expectedType: 'number'
        });
      }
      return { type: 'array', elementType: 'number' };
    }

    return { type: 'any' };
  }

  private inferCallExpression(node: any): TypeInfo {
    const calleeType = this.inferType(node.callee);
    
    if (calleeType.type !== 'function') {
      this.errors.push({
        ...this.getLocation(node),
        message: 'Cannot call non-function value',
        code: 'NOT_A_FUNCTION',
        expectedType: 'function',
        actualType: calleeType.type
      });
      return { type: 'unknown' };
    }

    if (calleeType.paramTypes && node.arguments) {
      const argTypes = node.arguments.map((arg: any) => this.inferType(arg));
      
      if (argTypes.length !== calleeType.paramTypes.length) {
        this.errors.push({
          ...this.getLocation(node),
          message: `Function expects ${calleeType.paramTypes.length} arguments, got ${argTypes.length}`,
          code: 'WRONG_ARGUMENT_COUNT'
        });
      } else {
        argTypes.forEach((argType: TypeInfo, i: number) => {
          const expectedType = calleeType.paramTypes![i];
          if (expectedType !== 'any' && !this.isCompatibleType(argType, expectedType)) {
            this.errors.push({
              line: node.arguments[i].location?.line || this.getLocation(node).line,
              column: node.arguments[i].location?.column || this.getLocation(node).column,
              message: `Argument ${i + 1} type mismatch`,
              code: 'ARGUMENT_TYPE_MISMATCH',
              expectedType,
              actualType: argType.type
            });
          }
        });
      }
    }

    return { type: calleeType.returnType || 'any' };
  }

  private inferFunction(node: any): TypeInfo {
    this.pushScope();
    
    const paramTypes: PrismType[] = [];
    if (node.parameters) {
      node.parameters.forEach((param: any) => {
        if (typeof param === 'string') {
          // Simple parameter name
          this.setType(param, { type: 'any' });
          paramTypes.push('any');
        } else if (param.type === 'IdentifierExpression') {
          this.setType(param.name, { type: 'any' });
          paramTypes.push('any');
        }
        // TODO: Handle destructuring patterns
      });
    }

    const bodyType = this.inferType(node.body);
    const returnType = node.body.type === 'BlockStatement' ? 'any' : bodyType.type;
    
    this.popScope();

    return {
      type: 'function',
      paramTypes,
      returnType
    };
  }

  private unifyTypes(types: TypeInfo[]): TypeInfo {
    if (types.length === 0) return { type: 'undefined' };
    if (types.length === 1) return types[0];

    const allSame = types.every(t => t.type === types[0].type);
    if (allSame) return types[0];

    const hasConfidence = types.some(t => t.isConfident || t.type === 'confidence');
    if (hasConfidence) {
      return { type: 'confidence', isConfident: true };
    }

    return { type: 'any' };
  }

  private isCompatibleType(actual: TypeInfo, expected: PrismType): boolean {
    if (expected === 'any' || actual.type === 'any') return true;
    if (actual.type === expected) return true;
    
    if (expected === 'confidence' && actual.isConfident) return true;
    if (actual.type === 'confidence' && expected === 'number') return true;
    
    if (actual.type === 'null' || actual.type === 'undefined') {
      return expected === 'null' || expected === 'undefined';
    }

    return false;
  }
}