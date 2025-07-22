import { ASTNode } from '@prism-lang/core';
import {
  ConfidenceIssue,
  CodePath,
  ConfidenceFlowResult,
  ConfidenceCompletenessResult
} from './types';

export interface ConfidenceChecker {
  checkConfidenceFlow(ast: ASTNode): ConfidenceFlowResult;
  checkConfidenceCompleteness(ast: ASTNode): ConfidenceCompletenessResult;
}

interface VariableConfidence {
  name: string;
  hasConfidence: boolean;
  usedWithConfidence: boolean;
  declaredAt: { line: number; column: number };
  usedAt: Array<{ line: number; column: number; operator: string }>;
}

export class ConfidenceFlowAnalyzer implements ConfidenceChecker {
  private variables: Map<string, VariableConfidence> = new Map();
  private currentScope: Set<string> = new Set();
  private issues: ConfidenceIssue[] = [];
  private paths: CodePath[] = [];
  private currentPath: CodePath | null = null;

  checkConfidenceFlow(ast: ASTNode): ConfidenceFlowResult {
    this.variables.clear();
    this.currentScope.clear();
    this.issues = [];

    this.analyzeNode(ast);
    this.validateConfidenceUsage();

    return {
      valid: this.issues.length === 0,
      issues: this.issues
    };
  }

  checkConfidenceCompleteness(ast: ASTNode): ConfidenceCompletenessResult {
    this.paths = [];
    this.currentPath = null;

    this.analyzePaths(ast);

    const missingPaths = this.paths.filter(path => path.missingConfidence);

    return {
      complete: missingPaths.length === 0,
      missingPaths
    };
  }

  private getLocation(node: any): { line: number; column: number } {
    return {
      line: node.location?.line || node.line || 1,
      column: node.location?.column || node.column || 1
    };
  }

  private analyzeNode(node: ASTNode | null): void {
    if (!node) return;

    const n = node as any;

    switch (n.type) {
      case 'Program':
        n.statements.forEach((stmt: any) => this.analyzeNode(stmt));
        break;

      case 'AssignmentStatement':
        const hasConfidence = this.hasConfidenceValue(n.value);
        const existing = this.variables.get(n.identifier);
        if (existing) {
          existing.hasConfidence = hasConfidence;
        } else {
          this.variables.set(n.identifier, {
            name: n.identifier,
            hasConfidence,
            usedWithConfidence: false,
            declaredAt: this.getLocation(n),
            usedAt: []
          });
        }
        this.analyzeNode(n.value);
        break;

      case 'AssignmentExpression':
        if (n.identifier) {
          const hasConf = this.hasConfidenceValue(n.value);
          const exist = this.variables.get(n.identifier);
          if (exist) {
            exist.hasConfidence = hasConf;
          } else {
            this.variables.set(n.identifier, {
              name: n.identifier,
              hasConfidence: hasConf,
              usedWithConfidence: false,
              declaredAt: this.getLocation(n),
              usedAt: []
            });
          }
        }
        this.analyzeNode(n.value);
        break;

      case 'UnaryExpression':
        if (n.operator === '~' && n.operand) {
          if (n.operand.type === 'IdentifierExpression' && n.operand.name) {
            const varInfo = this.variables.get(n.operand.name);
            if (varInfo) {
              varInfo.usedWithConfidence = true;
              varInfo.usedAt.push({
                ...this.getLocation(n),
                operator: '~'
              });
              
              if (!varInfo.hasConfidence) {
                this.issues.push({
                  ...this.getLocation(n),
                  message: `Variable '${n.operand.name}' uses confidence operator ~ but has no confidence value assigned`,
                  code: 'CONFIDENCE_WITHOUT_VALUE',
                  variableName: n.operand.name,
                  suggestion: `Assign a confidence value using 'const ${n.operand.name} = value @ 0.8' or similar`
                });
              }
            }
          }
        }
        this.analyzeNode(n.operand);
        break;

      case 'BinaryExpression':
        if (this.isConfidenceOperator(n.operator)) {
          if (n.left && n.left.type === 'IdentifierExpression') {
            const varInfo = this.variables.get(n.left.name);
            if (varInfo) {
              varInfo.usedWithConfidence = true;
              varInfo.usedAt.push({
                ...this.getLocation(n),
                operator: n.operator
              });
              
              if (!varInfo.hasConfidence) {
                this.issues.push({
                  ...this.getLocation(n),
                  message: `Variable '${n.left.name}' used with confidence operator ${n.operator} but has no confidence value`,
                  code: 'CONFIDENCE_OPERATOR_WITHOUT_VALUE',
                  variableName: n.left.name,
                  suggestion: `Ensure '${n.left.name}' is assigned with confidence before using ${n.operator}`
                });
              }
            }
          }
        }
        this.analyzeNode(n.left);
        this.analyzeNode(n.right);
        break;

      case 'ConfidenceExpression':
        this.analyzeNode(n.expression);
        if (n.confidence && typeof n.confidence !== 'number') {
          this.analyzeNode(n.confidence);
        }
        break;

      case 'UncertainIfStatement':
        this.analyzeNode(n.condition);
        
        if (!this.hasConfidenceValue(n.condition)) {
          this.issues.push({
            ...this.getLocation(n),
            message: 'Uncertain if statement test expression should evaluate to a confidence value',
            code: 'UNCERTAIN_WITHOUT_CONFIDENCE',
            suggestion: 'Use a confidence expression or variable with confidence in the test'
          });
        }

        const branches = n.branches || {};
        if (branches.high) this.analyzeNode(branches.high);
        if (branches.medium) this.analyzeNode(branches.medium);
        if (branches.low) this.analyzeNode(branches.low);
        if (branches.default) this.analyzeNode(branches.default);
        
        // Check for incomplete branches
        if (!branches.high && !branches.medium && !branches.low) {
          this.issues.push({
            ...this.getLocation(n),
            message: 'Uncertain if statement should have at least one confidence branch',
            code: 'INCOMPLETE_CONFIDENCE_BRANCHES',
            suggestion: 'Add high, medium, or low branches to handle different confidence levels'
          });
        } else if (!branches.low) {
          this.issues.push({
            ...this.getLocation(n),
            message: 'Uncertain if statement should have all confidence branches (high, medium, low)',
            code: 'INCOMPLETE_CONFIDENCE_BRANCHES',
            suggestion: 'Add missing confidence branches to handle all confidence levels'
          });
        }
        break;

      case 'BlockStatement':
        const previousScope = new Set(this.currentScope);
        n.statements.forEach((stmt: any) => this.analyzeNode(stmt));
        this.currentScope = previousScope;
        break;

      case 'FunctionExpression':
      case 'LambdaExpression':
        const prevVars = new Map(this.variables);
        const prevScope = new Set(this.currentScope);
        
        this.currentScope.clear();
        if (n.parameters) {
          n.parameters.forEach((param: any) => {
            if (param.type === 'IdentifierExpression') {
              this.currentScope.add(param.name);
            }
          });
        }
        
        this.analyzeNode(n.body);
        
        this.variables = prevVars;
        this.currentScope = prevScope;
        break;

      case 'CallExpression':
        this.analyzeNode(n.callee);
        if (n.arguments) {
          n.arguments.forEach((arg: any) => this.analyzeNode(arg));
        }
        break;

      case 'PropertyAccess':
      case 'OptionalChainAccess':
        this.analyzeNode(n.object);
        break;

      case 'IndexAccess':
        this.analyzeNode(n.object);
        this.analyzeNode(n.index);
        break;

      case 'IfStatement':
        this.analyzeNode(n.condition);
        this.analyzeNode(n.thenStatement);
        if (n.elseStatement) {
          this.analyzeNode(n.elseStatement);
        }
        break;

      case 'ForLoop':
        if (n.init) this.analyzeNode(n.init);
        if (n.condition) this.analyzeNode(n.condition);
        if (n.update) this.analyzeNode(n.update);
        this.analyzeNode(n.body);
        break;

      case 'ForInLoop':
        this.analyzeNode(n.iterable);
        this.analyzeNode(n.body);
        break;

      case 'WhileLoop':
        this.analyzeNode(n.condition);
        this.analyzeNode(n.body);
        break;

      case 'DoWhileLoop':
        this.analyzeNode(n.body);
        this.analyzeNode(n.condition);
        break;

      case 'TernaryExpression':
        this.analyzeNode(n.condition);
        this.analyzeNode(n.thenExpression);
        this.analyzeNode(n.elseExpression);
        break;

      case 'ArrayLiteral':
        n.elements.forEach((elem: any) => this.analyzeNode(elem));
        break;

      case 'ObjectLiteral':
        n.properties.forEach((prop: any) => {
          this.analyzeNode(prop.value);
        });
        break;

      case 'ExpressionStatement':
        this.analyzeNode(n.expression);
        break;

      case 'InterpolatedString':
        n.expressions.forEach((expr: any) => this.analyzeNode(expr));
        break;

      case 'SpreadElement':
        this.analyzeNode(n.expression);
        break;

      case 'UncertainForLoop':
      case 'UncertainWhileLoop':
        if (n.condition) this.analyzeNode(n.condition);
        if (n.body) this.analyzeNode(n.body);
        const ubranches = n.branches || {};
        if (ubranches.high) this.analyzeNode(ubranches.high);
        if (ubranches.medium) this.analyzeNode(ubranches.medium);
        if (ubranches.low) this.analyzeNode(ubranches.low);
        if (ubranches.default) this.analyzeNode(ubranches.default);
        break;

      case 'ContextStatement':
      case 'AgentDeclaration':
        if (n.body) {
          const newDeclContext = new Set(this.currentScope);
          this.analyzeNode(n.body);
          this.currentScope = newDeclContext;
        }
        break;

      case 'ArrayPattern':
      case 'ObjectPattern':
      case 'DestructuringAssignment':
        // These need more complex handling for tracking variables
        // For now, just analyze any expressions within
        if (n.elements) {
          n.elements.forEach((elem: any) => {
            if (elem && elem.type !== 'IdentifierExpression') {
              this.analyzeNode(elem);
            }
          });
        }
        if (n.properties) {
          n.properties.forEach((prop: any) => {
            if (prop.value && prop.value.type !== 'IdentifierExpression') {
              this.analyzeNode(prop.value);
            }
            if (prop.defaultValue) {
              this.analyzeNode(prop.defaultValue);
            }
          });
        }
        break;
    }
  }

  private analyzePaths(node: ASTNode | null, inFunction: boolean = false): boolean {
    if (!node) return false;

    const n = node as any;

    switch (n.type) {
      case 'Program':
        n.statements.forEach((stmt: any) => this.analyzePaths(stmt, false));
        return true;

      case 'FunctionExpression':
      case 'LambdaExpression':
        const prevPath = this.currentPath;
        this.currentPath = {
          startLine: this.getLocation(n).line,
          endLine: this.getLocation(n.body || n).line,
          description: 'function',
          missingConfidence: false
        };
        
        let hasReturn = false;
        if (n.body) {
          if (n.body.type === 'BlockStatement') {
            hasReturn = this.analyzePaths(n.body, true);
          } else {
            // Arrow function with expression body
            hasReturn = true;
            const hasConfidence = this.hasConfidenceValue(n.body);
            if (inFunction && !hasConfidence) {
              this.currentPath.missingConfidence = true;
              this.currentPath.description = 'arrow function return without confidence';
            }
          }
        }
        
        if (inFunction && !hasReturn) {
          this.currentPath.missingConfidence = true;
          this.currentPath.description = 'function with no explicit return';
        }
        
        if (this.currentPath.missingConfidence) {
          this.paths.push(this.currentPath);
        }
        
        this.currentPath = prevPath;
        return false;

      case 'BlockStatement':
        let blockHasReturn = false;
        for (const stmt of n.statements) {
          if (this.analyzePaths(stmt, inFunction)) {
            blockHasReturn = true;
          }
        }
        return blockHasReturn;

      case 'ExpressionStatement':
        if (n.expression && n.expression.type === 'CallExpression' && 
            n.expression.callee && n.expression.callee.name === 'return') {
          // Handle return as function call
          if (inFunction && n.expression.arguments && n.expression.arguments[0]) {
            const hasConfidence = this.hasConfidenceValue(n.expression.arguments[0]);
            if (!hasConfidence && this.currentPath) {
              this.currentPath.missingConfidence = true;
              this.currentPath.description = 'return statement without confidence';
              this.currentPath.endLine = this.getLocation(n).line;
            }
          }
          return true;
        }
        return false;

      case 'IfStatement':
        const testHasConfidence = this.hasConfidenceValue(n.condition);
        const consequentReturns = this.analyzePaths(n.thenStatement, inFunction);
        const alternateReturns = n.elseStatement ? this.analyzePaths(n.elseStatement, inFunction) : false;
        
        if (inFunction && consequentReturns && alternateReturns) {
          return true;
        }
        
        if (inFunction && !testHasConfidence && (consequentReturns || alternateReturns)) {
          const path: CodePath = {
            startLine: this.getLocation(n).line,
            endLine: this.getLocation(n).line,
            description: 'conditional path without confidence',
            missingConfidence: true
          };
          this.paths.push(path);
        }
        
        return false;

      case 'UncertainIfStatement':
        const branches = n.branches || {};
        if (branches.high) this.analyzePaths(branches.high, inFunction);
        if (branches.medium) this.analyzePaths(branches.medium, inFunction);
        if (branches.low) this.analyzePaths(branches.low, inFunction);
        if (branches.default) this.analyzePaths(branches.default, inFunction);
        
        return false;

      default:
        return false;
    }
  }

  private hasConfidenceValue(node: ASTNode | null): boolean {
    if (!node) return false;

    const n = node as any;

    switch (n.type) {
      case 'ConfidenceExpression':
        return true;

      case 'UnaryExpression':
        return n.operator === '~';

      case 'BinaryExpression':
        return this.isConfidenceOperator(n.operator) || 
               this.hasConfidenceValue(n.left) || 
               this.hasConfidenceValue(n.right);

      case 'IdentifierExpression':
        const varInfo = this.variables.get(n.name);
        return varInfo ? varInfo.hasConfidence : false;

      case 'CallExpression':
        if (n.callee && n.callee.type === 'IdentifierExpression' && n.callee.name === 'llm') {
          return true;
        }
        return false;

      case 'TernaryExpression':
        return this.hasConfidenceValue(n.thenExpression) && 
               this.hasConfidenceValue(n.elseExpression);

      default:
        return false;
    }
  }

  private isConfidenceOperator(op: string): boolean {
    return [
      '~>', '~>=', '~<=', '~<', '~==', '~!=',
      '~+', '~-', '~*', '~/', '~%', '~**',
      '~&&', '~||', '~??', '~|>'
    ].includes(op);
  }

  private validateConfidenceUsage(): void {
    this.variables.forEach((varInfo, name) => {
      if (varInfo.usedWithConfidence && !varInfo.hasConfidence) {
        if (varInfo.usedAt.length > 0) {
          const firstUse = varInfo.usedAt[0];
          this.issues.push({
            line: firstUse.line,
            column: firstUse.column,
            message: `Variable '${name}' is used with confidence operators but never assigned a confidence value`,
            code: 'VARIABLE_MISSING_CONFIDENCE',
            variableName: name,
            suggestion: `Initialize '${name}' with a confidence value, e.g., 'const ${name} = value @ 0.8'`
          });
        }
      }
    });
  }
}