import { parse, ASTNode } from '@prism-lang/core';
import { 
  ValidationResult, 
  ParseResult, 
  SyntaxError, 
  Warning, 
  ParseError 
} from './types';

export interface PrismValidator {
  validate(code: string): ValidationResult;
  parse(code: string): ParseResult;
}

export class Validator implements PrismValidator {
  private asyncFunctionContext: boolean = false;
  validate(code: string): ValidationResult {
    const errors: SyntaxError[] = [];
    const warnings: Warning[] = [];

    try {
      const ast = parse(code);
      
      this.validateSyntax(ast, errors, warnings);
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error: any) {
      if (error.line !== undefined && error.column !== undefined) {
        errors.push({
          line: error.line,
          column: error.column,
          message: error.message || 'Syntax error',
          code: 'SYNTAX_ERROR',
          severity: 'error'
        });
      } else {
        errors.push({
          line: 1,
          column: 1,
          message: error.message || 'Unknown parsing error',
          code: 'PARSE_ERROR',
          severity: 'error'
        });
      }
      
      return {
        valid: false,
        errors,
        warnings
      };
    }
  }

  parse(code: string): ParseResult {
    const errors: ParseError[] = [];

    try {
      const ast = parse(code);
      return {
        ast,
        errors
      };
    } catch (error: any) {
      errors.push({
        line: error.line || 1,
        column: error.column || 1,
        message: error.message || 'Parse error',
        code: 'PARSE_ERROR',
        token: error.token
      });
      
      return {
        ast: undefined,
        errors
      };
    }
  }

  private getLocation(node: any): { line: number; column: number } {
    return {
      line: node.location?.line || node.line || 1,
      column: node.location?.column || node.column || 1
    };
  }

  private validateSyntax(ast: ASTNode, errors: SyntaxError[], warnings: Warning[]): void {
    this.validateNode(ast, errors, warnings);
  }

  private validateNode(node: ASTNode | null, errors: SyntaxError[], warnings: Warning[]): void {
    if (!node) return;

    const n = node as any;

    switch (n.type) {
      case 'Program':
        n.statements.forEach((stmt: any) => this.validateNode(stmt, errors, warnings));
        break;

      case 'UncertainIfStatement':
        this.validateUncertainIf(n, errors, warnings);
        break;

      case 'ConfidenceExpression':
        this.validateConfidenceExpression(n, errors, warnings);
        break;

      case 'ForLoop':
      case 'UncertainForLoop':
        this.validateForLoop(n, errors, warnings);
        break;

      case 'WhileLoop':
      case 'UncertainWhileLoop':
        this.validateWhileLoop(n, errors, warnings);
        break;

      case 'FunctionExpression':
      case 'LambdaExpression':
        this.validateFunction(n, errors, warnings);
        break;

      case 'AssignmentStatement':
        this.validateNode(n.value, errors, warnings);
        break;

      case 'AssignmentExpression':
        this.validateNode(n.value, errors, warnings);
        break;

      case 'ConstDeclaration':
        this.validateConstDeclaration(n, errors, warnings);
        break;

      case 'LetDeclaration':
        this.validateLetDeclaration(n, errors, warnings);
        break;

      case 'FunctionDeclaration':
        this.validateFunctionDeclaration(n, errors, warnings);
        break;

      case 'BinaryExpression':
        this.validateBinaryExpression(n, errors, warnings);
        break;

      case 'UnaryExpression':
        this.validateUnaryExpression(n, errors, warnings);
        break;

      case 'AwaitExpression':
        this.validateAwaitExpression(n, errors, warnings);
        break;

      case 'CallExpression':
        this.validateCallExpression(n, errors, warnings);
        break;

      case 'PropertyAccess':
      case 'OptionalChainAccess':
        this.validateNode(n.object, errors, warnings);
        break;

      case 'IndexAccess':
        this.validateNode(n.object, errors, warnings);
        this.validateNode(n.index, errors, warnings);
        break;

      case 'ArrayLiteral':
        n.elements.forEach((elem: any) => this.validateNode(elem, errors, warnings));
        break;

      case 'ObjectLiteral':
        n.properties.forEach((prop: any) => {
          this.validateNode(prop.value, errors, warnings);
        });
        break;

      case 'BlockStatement':
        n.statements.forEach((stmt: any) => this.validateNode(stmt, errors, warnings));
        break;

      case 'IfStatement':
        this.validateNode(n.condition, errors, warnings);
        this.validateNode(n.thenStatement, errors, warnings);
        if (n.elseStatement) {
          this.validateNode(n.elseStatement, errors, warnings);
        }
        break;

      case 'VariableDeclaration':
        this.validateVariableDeclaration(n, errors, warnings);
        break;

      case 'ExpressionStatement':
        this.validateNode(n.expression, errors, warnings);
        break;

      case 'TernaryExpression':
        this.validateNode(n.condition, errors, warnings);
        this.validateNode(n.trueBranch, errors, warnings);
        this.validateNode(n.falseBranch, errors, warnings);
        break;

      case 'ConfidentTernaryExpression':
        this.validateNode(n.condition, errors, warnings);
        this.validateNode(n.trueBranch, errors, warnings);
        this.validateNode(n.falseBranch, errors, warnings);
        break;

      case 'SpreadElement':
        this.validateNode(n.expression, errors, warnings);
        break;

      case 'InterpolatedString':
        n.expressions.forEach((expr: any) => this.validateNode(expr, errors, warnings));
        break;

      case 'ContextStatement':
        this.validateNode(n.body, errors, warnings);
        break;

      case 'AgentDeclaration':
        // No body to validate
        break;

      case 'ImportStatement':
        this.validateImportStatement(n, errors, warnings);
        break;

      case 'ExportStatement':
        this.validateExportStatement(n, errors, warnings);
        break;

      case 'ReturnStatement':
        this.validateReturnStatement(n, errors, warnings);
        break;

      case 'ForInLoop':
        this.validateNode(n.iterable, errors, warnings);
        this.validateNode(n.body, errors, warnings);
        break;

      case 'DoWhileLoop':
        this.validateNode(n.body, errors, warnings);
        this.validateNode(n.condition, errors, warnings);
        break;

      case 'ArrayPattern':
      case 'ObjectPattern':
      case 'DestructuringAssignment':
        // Complex patterns - validate contained expressions
        if (n.elements) {
          n.elements.forEach((elem: any) => {
            if (elem) this.validateNode(elem, errors, warnings);
          });
        }
        if (n.properties) {
          n.properties.forEach((prop: any) => {
            if (prop.value) this.validateNode(prop.value, errors, warnings);
            if (prop.defaultValue) this.validateNode(prop.defaultValue, errors, warnings);
          });
        }
        break;

      case 'IdentifierExpression':
      case 'NumberLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'NullLiteral':
      case 'UndefinedLiteral':
      case 'BreakStatement':
      case 'ContinueStatement':
      case 'PlaceholderExpression':
        // Leaf nodes - no validation needed
        break;

      default:
        warnings.push({
          ...this.getLocation(n),
          message: `Unknown node type: ${n.type}`,
          code: 'UNKNOWN_NODE_TYPE',
          severity: 'warning'
        });
    }
  }

  private validateUncertainIf(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    this.validateNode(node.condition, errors, warnings);

    const branches = node.branches || {};
    const hasBranches = branches.high || branches.medium || branches.low || branches.default;
    
    if (!hasBranches) {
      errors.push({
        ...this.getLocation(node),
        message: 'Uncertain if statement must have at least one confidence branch (high, medium, or low)',
        code: 'MISSING_CONFIDENCE_BRANCHES',
        severity: 'error'
      });
    }

    if (branches.high) this.validateNode(branches.high, errors, warnings);
    if (branches.medium) this.validateNode(branches.medium, errors, warnings);
    if (branches.low) this.validateNode(branches.low, errors, warnings);
    if (branches.default) this.validateNode(branches.default, errors, warnings);
  }

  private validateConfidenceExpression(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    this.validateNode(node.expression, errors, warnings);
    
    if (node.confidence !== undefined) {
      if (typeof node.confidence === 'number') {
        if (node.confidence < 0 || node.confidence > 1) {
          errors.push({
            ...this.getLocation(node),
            message: `Confidence value must be between 0 and 1, got ${node.confidence}`,
            code: 'INVALID_CONFIDENCE_VALUE',
            severity: 'error'
          });
        }
      } else if (node.confidence.type === 'NumberLiteral') {
        const value = node.confidence.value;
        if (value < 0 || value > 1) {
          errors.push({
            ...this.getLocation(node),
            message: `Confidence value must be between 0 and 1, got ${value}`,
            code: 'INVALID_CONFIDENCE_VALUE',
            severity: 'error'
          });
        }
      } else {
        this.validateNode(node.confidence, errors, warnings);
      }
    }
  }

  private validateForLoop(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    if (node.init) this.validateNode(node.init, errors, warnings);
    if (node.condition) this.validateNode(node.condition, errors, warnings);
    if (node.update) this.validateNode(node.update, errors, warnings);
    this.validateNode(node.body, errors, warnings);

    if (node.type === 'UncertainForLoop') {
      const branches = node.branches || {};
      const hasBranches = branches.high || branches.medium || branches.low || branches.default;
      if (!hasBranches) {
        warnings.push({
          ...this.getLocation(node),
          message: 'Uncertain for loop has no confidence branches',
          code: 'NO_CONFIDENCE_BRANCHES',
          severity: 'warning'
        });
      }
      if (branches.high) this.validateNode(branches.high, errors, warnings);
      if (branches.medium) this.validateNode(branches.medium, errors, warnings);
      if (branches.low) this.validateNode(branches.low, errors, warnings);
      if (branches.default) this.validateNode(branches.default, errors, warnings);
    }
  }

  private validateWhileLoop(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    this.validateNode(node.condition, errors, warnings);
    this.validateNode(node.body, errors, warnings);

    if (node.type === 'UncertainWhileLoop') {
      const branches = node.branches || {};
      const hasBranches = branches.high || branches.medium || branches.low || branches.default;
      if (!hasBranches) {
        warnings.push({
          ...this.getLocation(node),
          message: 'Uncertain while loop has no confidence branches',
          code: 'NO_CONFIDENCE_BRANCHES',
          severity: 'warning'
        });
      }
      if (branches.high) this.validateNode(branches.high, errors, warnings);
      if (branches.medium) this.validateNode(branches.medium, errors, warnings);
      if (branches.low) this.validateNode(branches.low, errors, warnings);
      if (branches.default) this.validateNode(branches.default, errors, warnings);
    }
  }

  private validateFunction(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    if (node.parameters) {
      node.parameters.forEach((param: any) => {
        if (param.type === 'RestElement') {
          this.validateNode(param.argument, errors, warnings);
        }
      });
    }
    this.validateNode(node.body, errors, warnings);
  }

  private validateBinaryExpression(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    this.validateNode(node.left, errors, warnings);
    this.validateNode(node.right, errors, warnings);

    const confidenceOperators = ['~>', '~>=', '~<=', '~<', '~==', '~!=', '~+', '~-', '~*', '~/', '~%', '~**', '~&&', '~||', '~??', '~|>'];
    
    if (confidenceOperators.includes(node.operator)) {
      if (node.left && node.left.type !== 'ConfidenceExpression' && node.left.type !== 'IdentifierExpression') {
        warnings.push({
          ...this.getLocation(node),
          message: `Confidence operator ${node.operator} used but left operand may not have confidence`,
          code: 'CONFIDENCE_OPERATOR_WITHOUT_CONFIDENCE',
          severity: 'warning'
        });
      }
    }
  }

  private validateUnaryExpression(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    this.validateNode(node.operand, errors, warnings);

    if (node.operator === '~') {
      if (node.operand && node.operand.type !== 'IdentifierExpression' && 
          node.operand.type !== 'PropertyAccess' && 
          node.operand.type !== 'IndexAccess') {
        errors.push({
          ...this.getLocation(node),
          message: 'Confidence operator ~ can only be used with identifiers or member expressions',
          code: 'INVALID_CONFIDENCE_OPERATOR_USE',
          severity: 'error'
        });
      }
    }
  }

  private validateCallExpression(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    this.validateNode(node.callee, errors, warnings);
    if (node.arguments) {
      node.arguments.forEach((arg: any) => this.validateNode(arg, errors, warnings));
    }
  }

  private validateConstDeclaration(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    // const declarations must have an initializer
    if (!node.init && !node.value) {
      errors.push({
        ...this.getLocation(node),
        message: 'const declarations must have an initializer',
        code: 'CONST_WITHOUT_INITIALIZER',
        severity: 'error'
      });
    }

    // Validate the initializer
    if (node.init) {
      this.validateNode(node.init, errors, warnings);
    } else if (node.value) {
      this.validateNode(node.value, errors, warnings);
    }

    // Validate identifier
    if (!node.id && !node.identifier) {
      errors.push({
        ...this.getLocation(node),
        message: 'const declaration missing identifier',
        code: 'MISSING_IDENTIFIER',
        severity: 'error'
      });
    }
  }

  private validateLetDeclaration(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    // let declarations can have optional initializer
    if (node.init) {
      this.validateNode(node.init, errors, warnings);
    } else if (node.value) {
      this.validateNode(node.value, errors, warnings);
    }

    // Validate identifier
    if (!node.id && !node.identifier) {
      errors.push({
        ...this.getLocation(node),
        message: 'let declaration missing identifier',
        code: 'MISSING_IDENTIFIER',
        severity: 'error'
      });
    }
  }

  private validateFunctionDeclaration(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    // Function must have a name
    if (!node.id && !node.name) {
      errors.push({
        ...this.getLocation(node),
        message: 'Function declaration must have a name',
        code: 'MISSING_FUNCTION_NAME',
        severity: 'error'
      });
    }

    // Validate parameters
    if (node.params || node.parameters) {
      const params = node.params || node.parameters;
      params.forEach((param: any) => {
        if (param.type === 'RestElement') {
          this.validateNode(param.argument, errors, warnings);
        } else if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
          this.validateNode(param, errors, warnings);
        }
      });
    }

    // Validate function body
    if (node.body) {
      // If it's an async function, validate await usage inside
      if (node.isAsync) {
        this.asyncFunctionContext = true;
      }
      this.validateNode(node.body, errors, warnings);
      if (node.isAsync) {
        this.asyncFunctionContext = false;
      }
    } else {
      errors.push({
        ...this.getLocation(node),
        message: 'Function declaration must have a body',
        code: 'MISSING_FUNCTION_BODY',
        severity: 'error'
      });
    }

    // Check for early returns
    if (node.body && node.body.type === 'BlockStatement') {
      this.checkEarlyReturns(node.body, errors, warnings);
    }
  }

  private validateReturnStatement(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    // Return statements must be inside functions
    // This is a simplified check - would need context tracking for full validation
    
    // Validate return argument if present
    if (node.argument) {
      this.validateNode(node.argument, errors, warnings);
    }
  }

  private validateImportStatement(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    // Import must have a source
    if (!node.source) {
      errors.push({
        ...this.getLocation(node),
        message: 'Import declaration must have a source',
        code: 'MISSING_IMPORT_SOURCE',
        severity: 'error'
      });
      return;
    }

    // Validate source is a string
    if (typeof node.source !== 'string') {
      errors.push({
        ...this.getLocation(node),
        message: 'Import source must be a string',
        code: 'INVALID_IMPORT_SOURCE',
        severity: 'error'
      });
    }

    // Validate specifiers - check if there's at least one way to import
    const hasSpecifiers = (node.specifiers && node.specifiers.length > 0) || 
                         node.defaultImport || 
                         node.namespaceImport;
    
    if (!hasSpecifiers) {
      warnings.push({
        ...this.getLocation(node),
        message: 'Import declaration has no specifiers',
        code: 'EMPTY_IMPORT_SPECIFIERS',
        severity: 'warning'
      });
    }

    // Validate each specifier
    if (node.specifiers) {
      node.specifiers.forEach((spec: any) => {
        if (spec.type === 'ImportDefaultSpecifier' && !spec.local) {
          errors.push({
            ...this.getLocation(spec),
            message: 'Import default specifier must have a local name',
            code: 'MISSING_LOCAL_NAME',
            severity: 'error'
          });
        }
        if (spec.type === 'ImportSpecifier' && (!spec.imported || !spec.local)) {
          errors.push({
            ...this.getLocation(spec),
            message: 'Import specifier must have both imported and local names',
            code: 'INCOMPLETE_IMPORT_SPECIFIER',
            severity: 'error'
          });
        }
      });
    }
  }

  private validateExportStatement(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    // Export must have either declaration or specifiers
    if (!node.declaration && (!node.specifiers || node.specifiers.length === 0)) {
      errors.push({
        ...this.getLocation(node),
        message: 'Export declaration must have either a declaration or specifiers',
        code: 'EMPTY_EXPORT',
        severity: 'error'
      });
      return;
    }

    // Validate declaration if present
    if (node.declaration) {
      this.validateNode(node.declaration, errors, warnings);
    }

    // Validate specifiers if present
    if (node.specifiers) {
      node.specifiers.forEach((spec: any) => {
        if (spec.type === 'ExportSpecifier' && (!spec.local || !spec.exported)) {
          errors.push({
            ...this.getLocation(spec),
            message: 'Export specifier must have both local and exported names',
            code: 'INCOMPLETE_EXPORT_SPECIFIER',
            severity: 'error'
          });
        }
      });
    }

    // Validate source for re-exports
    if (node.source && typeof node.source !== 'string') {
      errors.push({
        ...this.getLocation(node),
        message: 'Export source must be a string',
        code: 'INVALID_EXPORT_SOURCE',
        severity: 'error'
      });
    }
  }

  private validateVariableDeclaration(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    // Check if identifier is provided
    if (!node.identifier) {
      errors.push({
        ...this.getLocation(node),
        message: `${node.kind} declaration missing identifier`,
        code: 'MISSING_IDENTIFIER',
        severity: 'error'
      });
    }

    // const must have an initializer
    if (node.kind === 'const' && !node.initializer) {
      errors.push({
        ...this.getLocation(node),
        message: 'const declarations must have an initializer',
        code: 'CONST_WITHOUT_INITIALIZER',
        severity: 'error'
      });
    }

    // Validate initializer if present
    if (node.initializer) {
      this.validateNode(node.initializer, errors, warnings);
    }

    // Validate pattern if present (for destructuring)
    if (node.pattern) {
      this.validateNode(node.pattern, errors, warnings);
    }
  }

  private checkEarlyReturns(blockNode: any, _errors: SyntaxError[], warnings: Warning[]): void {
    if (!blockNode.statements) return;

    let hasReturn = false;
    let returnIndex = -1;

    // Find first return statement
    for (let i = 0; i < blockNode.statements.length; i++) {
      const stmt = blockNode.statements[i];
      if (stmt.type === 'ReturnStatement') {
        hasReturn = true;
        returnIndex = i;
        break;
      }
    }

    // Check for unreachable code after return
    if (hasReturn && returnIndex < blockNode.statements.length - 1) {
      const unreachableStmt = blockNode.statements[returnIndex + 1];
      warnings.push({
        ...this.getLocation(unreachableStmt),
        message: 'Unreachable code after return statement',
        code: 'UNREACHABLE_CODE',
        severity: 'warning'
      });
    }
  }

  private validateAwaitExpression(node: any, errors: SyntaxError[], warnings: Warning[]): void {
    // Validate the expression being awaited
    this.validateNode(node.expression, errors, warnings);

    // Check if await is used outside of async function
    if (!this.asyncFunctionContext) {
      errors.push({
        ...this.getLocation(node),
        message: 'await can only be used inside async functions',
        code: 'AWAIT_OUTSIDE_ASYNC',
        severity: 'error'
      });
    }
  }
}