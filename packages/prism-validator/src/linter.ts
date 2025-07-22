import { ASTNode } from '@prism-lang/core';
import { LintResult, LinterConfig } from './types';

export interface PrismLinter {
  lint(code: string, config?: LinterConfig): LintResult[];
}

export class Linter implements PrismLinter {
  private config: LinterConfig;
  private results: LintResult[] = [];

  constructor(config?: Partial<LinterConfig>) {
    this.config = this.mergeWithDefaults(config);
  }

  lint(code: string, config?: Partial<LinterConfig>): LintResult[] {
    this.results = [];
    
    if (config) {
      this.config = this.mergeWithDefaults(config);
    }

    try {
      const { parse } = require('@prism-lang/core');
      const ast = parse(code);
      this.lintNode(ast);
    } catch (error: any) {
      this.results.push({
        line: error.line || 1,
        column: error.column || 1,
        message: `Parse error: ${error.message}`,
        ruleId: 'parse-error',
        severity: 'error'
      });
    }

    return this.results;
  }

  private mergeWithDefaults(config?: Partial<LinterConfig>): LinterConfig {
    const defaults: LinterConfig = {
      rules: {
        'no-infinite-loops': true,
        'confidence-range': true,
        'uncertain-completeness': true,
        'variable-declared-before-use': true,
        'no-unused-variables': true,
        'confidence-operator-usage': true,
        'no-constant-condition': true,
        'no-unreachable-code': true,
        'consistent-confidence-usage': true,
        'require-confidence-in-uncertain': true,
        'no-empty-blocks': true,
        'no-duplicate-confidence-branches': true,
        'prefer-confidence-operators': true,
        'max-nested-uncertainty': true
      },
      maxConfidenceValue: 1,
      minConfidenceValue: 0,
      requireConfidenceInUncertain: true,
      allowInfiniteLoops: false
    };

    if (!config) return defaults;

    return {
      ...defaults,
      ...config,
      rules: { ...defaults.rules, ...config.rules }
    };
  }

  private isRuleEnabled(ruleId: string): boolean {
    const rule = this.config.rules[ruleId];
    if (typeof rule === 'boolean') return rule;
    if (typeof rule === 'object' && rule.enabled !== undefined) return rule.enabled;
    return false;
  }

  private lintNode(node: ASTNode | null, context: LintContext = {}): void {
    if (!node) return;

    const n = node as any;
    switch (n.type) {
      case 'Program':
        // Handle empty programs gracefully
        if (!n.statements) {
          return;
        }
        const declaredVars = new Set<string>();
        const usedVars = new Set<string>();
        const confidenceVars = new Set<string>();
        this.collectVariables(n, declaredVars, usedVars);
        this.collectConfidenceVariables(n, confidenceVars);
        this.checkUnusedVariables(declaredVars, usedVars);
        
        n.statements.forEach((stmt: any) => this.lintNode(stmt, { ...context, declaredVars, usedVars, confidenceVars }));
        break;

      case 'WhileLoop':
      case 'ForLoop':
        this.checkInfiniteLoop(n);
        this.checkConstantCondition(n);
        if (n.condition) this.lintNode(n.condition, context);
        if (n.body) this.lintNode(n.body, context);
        if (n.type === 'ForLoop') {
          if (n.init) this.lintNode(n.init, context);
          if (n.update) this.lintNode(n.update, context);
        }
        break;

      case 'UncertainIfStatement':
        this.checkUncertainCompleteness(n);
        this.checkDuplicateConfidenceBranches(n);
        this.checkConfidenceInUncertain(n, context);
        if (n.condition) this.lintNode(n.condition, context);
        if (n.branches) {
          if (n.branches.high) this.lintNode(n.branches.high, context);
          if (n.branches.medium) this.lintNode(n.branches.medium, context);
          if (n.branches.low) this.lintNode(n.branches.low, context);
          if (n.branches.default) this.lintNode(n.branches.default, context);
        }
        break;

      case 'ConfidenceExpression':
        this.checkConfidenceRange(n);
        this.lintNode(n.expression, context);
        if (n.confidence && typeof n.confidence !== 'number') {
          this.lintNode(n.confidence, context);
        }
        break;

      case 'BinaryExpression':
        this.checkConfidenceOperatorUsage(n);
        this.checkPreferConfidenceOperators(n, context);
        this.lintNode(n.left, context);
        this.lintNode(n.right, context);
        break;

      case 'UnaryExpression':
        if (n.operator === '~') {
          this.checkConfidenceOperatorUsage(n);
        }
        if (n.operand) this.lintNode(n.operand, context);
        break;

      case 'BlockStatement':
        if (this.isRuleEnabled('no-empty-blocks') && (!n.statements || n.statements.length === 0)) {
          this.addResult({
            line: n.line || 1,
            column: n.column || 1,
            message: 'Empty block statement',
            ruleId: 'no-empty-blocks',
            severity: 'warning'
          });
        }
        if (n.statements) {
          n.statements.forEach((stmt: any) => this.lintNode(stmt, context));
        }
        break;

      case 'AssignmentStatement':
        if (context.declaredVars) {
          context.declaredVars.add(n.identifier);
        }
        if (n.value) {
          this.lintNode(n.value, context);
        }
        break;

      case 'IdentifierExpression':
        if (context.usedVars && !['undefined', 'null', 'true', 'false'].includes(n.name)) {
          context.usedVars.add(n.name);
        }
        this.checkVariableDeclaredBeforeUse(n, context);
        break;

      case 'LambdaExpression':
        const newContext = { ...context, inFunction: true, declaredVars: new Set(context.declaredVars) };
        if (n.parameters && newContext.declaredVars) {
          n.parameters.forEach((param: any) => {
            if (typeof param === 'string') {
              newContext.declaredVars.add(param);
            } else if (param.name) {
              newContext.declaredVars.add(param.name);
            }
          });
        }
        if (n.body) {
          this.lintNode(n.body, newContext);
        }
        break;

      case 'ReturnStatement':
        if (!context.inFunction) {
          this.addResult({
            line: n.line || 1,
            column: n.column || 1,
            message: 'Return statement outside of function',
            ruleId: 'return-outside-function',
            severity: 'error'
          });
        }
        if (n.argument) {
          this.lintNode(n.argument, context);
        }
        break;

      case 'IfStatement':
        this.checkConstantCondition(n);
        if (n.condition) this.lintNode(n.condition, context);
        if (n.thenStatement) this.lintNode(n.thenStatement, context);
        if (n.elseStatement) {
          this.lintNode(n.elseStatement, context);
        }
        break;

      case 'CallExpression':
        this.lintNode(n.callee, context);
        n.arguments.forEach((arg: any) => this.lintNode(arg, context));
        break;

      case 'MemberExpression':
        this.lintNode(n.object, context);
        if (n.computed) {
          this.lintNode(n.property, context);
        }
        break;

      case 'ArrayExpression':
        n.elements.forEach((elem: any) => this.lintNode(elem, context));
        break;

      case 'ObjectExpression':
        const seenKeys = new Set<string>();
        n.properties.forEach((prop: any) => {
          if (prop.key.type === 'Identifier') {
            if (seenKeys.has(prop.key.name)) {
              this.addResult({
                line: prop.line || 1,
                column: prop.column || 1,
                message: `Duplicate object key '${prop.key.name}'`,
                ruleId: 'duplicate-object-key',
                severity: 'error'
              });
            }
            seenKeys.add(prop.key.name);
          }
          this.lintNode(prop.value, context);
        });
        break;

      case 'ConditionalExpression':
        this.lintNode(n.test, context);
        this.lintNode(n.consequent, context);
        this.lintNode(n.alternate, context);
        break;

      case 'LogicalExpression':
        this.lintNode(n.left, context);
        this.lintNode(n.right, context);
        break;

      case 'UpdateExpression':
        this.lintNode(n.argument, context);
        break;

      case 'AssignmentExpression':
        this.lintNode(n.left, context);
        this.lintNode(n.right, context);
        break;

      case 'SequenceExpression':
        n.expressions.forEach((expr: any) => this.lintNode(expr, context));
        break;

      case 'ThrowStatement':
        this.lintNode(n.argument, context);
        break;

      case 'TryStatement':
        this.lintNode(n.block, context);
        if (n.handler) {
          const catchContext = { ...context, declaredVars: new Set(context.declaredVars) };
          if (n.handler.param && n.handler.param.type === 'Identifier' && catchContext.declaredVars) {
            catchContext.declaredVars.add(n.handler.param.name);
          }
          this.lintNode(n.handler.body, catchContext);
        }
        if (n.finalizer) {
          this.lintNode(n.finalizer, context);
        }
        break;

      case 'ExpressionStatement':
        this.lintNode(n.expression, context);
        break;

      case 'TemplateLiteral':
        n.expressions.forEach((expr: any) => this.lintNode(expr, context));
        break;

      case 'SpreadElement':
        this.lintNode(n.argument, context);
        break;

      case 'PatternMatchExpression':
        this.lintNode(n.value, context);
        n.cases.forEach((caseNode: any) => {
          this.lintNode(caseNode.pattern, context);
          this.lintNode(caseNode.value, context);
        });
        break;

      case 'RangeExpression':
        this.lintNode(n.start, context);
        this.lintNode(n.end, context);
        break;

      case 'UncertainForLoop':
      case 'UncertainWhileLoop':
        this.checkConfidenceInUncertain(n, context);
        if (n.condition) this.lintNode(n.condition, context);
        if (n.body) this.lintNode(n.body, context);
        if (n.branches) {
          if (n.branches.high) this.lintNode(n.branches.high, context);
          if (n.branches.medium) this.lintNode(n.branches.medium, context);
          if (n.branches.low) this.lintNode(n.branches.low, context);
          if (n.branches.default) this.lintNode(n.branches.default, context);
        }
        break;

      case 'ContextDeclaration':
      case 'AgentDeclaration':
        const newDeclContext = { ...context, declaredVars: new Set(context.declaredVars) };
        if (n.statements) {
          n.statements.forEach((stmt: any) => this.lintNode(stmt, newDeclContext));
        } else if (n.body) {
          n.body.forEach((stmt: any) => this.lintNode(stmt, newDeclContext));
        }
        break;

      // Add commonly used node types that were missing
      case 'PropertyAccess':
        this.lintNode(n.object, context);
        if (n.property) {
          this.lintNode(n.property, context);
        }
        break;

      case 'ArrayLiteral':
        if (n.elements) {
          n.elements.forEach((elem: any) => {
            if (elem) this.lintNode(elem, context);
          });
        }
        break;

      case 'ObjectLiteral':
        const seenObjectKeys = new Set<string>();
        if (n.properties) {
          n.properties.forEach((prop: any) => {
            if (prop.key) {
              if (typeof prop.key === 'string') {
                if (seenObjectKeys.has(prop.key)) {
                  this.addResult({
                    line: prop.line || 1,
                    column: prop.column || 1,
                    message: `Duplicate object key '${prop.key}'`,
                    ruleId: 'duplicate-object-key',
                    severity: 'error'
                  });
                }
                seenObjectKeys.add(prop.key);
              } else if (prop.key.name) {
                if (seenObjectKeys.has(prop.key.name)) {
                  this.addResult({
                    line: prop.line || 1,
                    column: prop.column || 1,
                    message: `Duplicate object key '${prop.key.name}'`,
                    ruleId: 'duplicate-object-key',
                    severity: 'error'
                  });
                }
                seenObjectKeys.add(prop.key.name);
              }
            }
            if (prop.value) {
              this.lintNode(prop.value, context);
            }
          });
        }
        break;

      case 'NumberLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'NullLiteral':
        // Literals don't need further processing
        break;

      // Handle other node types gracefully
      default:
        // For unhandled node types, try to recursively lint any child nodes
        Object.values(n).forEach(child => {
          if (child && typeof child === 'object') {
            if (Array.isArray(child)) {
              child.forEach(item => {
                if (item && typeof item === 'object' && item.type) {
                  this.lintNode(item as any, context);
                }
              });
            } else if ((child as any).type) {
              this.lintNode(child as any, context);
            }
          }
        });
        break;
    }
  }

  private checkInfiniteLoop(node: any): void {
    if (!this.isRuleEnabled('no-infinite-loops') || this.config.allowInfiniteLoops) return;

    if (node.type === 'WhileLoop' && node.condition && node.condition.type === 'BooleanLiteral' && node.condition.value === true) {
      this.addResult({
        line: node.line || 1,
        column: node.column || 1,
        message: 'Potentially infinite loop: while(true) without break statement',
        ruleId: 'no-infinite-loops',
        severity: 'warning',
        fix: {
          description: 'Add a break condition inside the loop',
          replacement: '',
          startLine: node.line || 1,
          startColumn: node.column || 1,
          endLine: node.line || 1,
          endColumn: node.column || 1
        }
      });
    }

    if (node.type === 'ForLoop' && !node.condition && !node.update) {
      this.addResult({
        line: node.line || 1,
        column: node.column || 1,
        message: 'Potentially infinite loop: for loop without condition or update',
        ruleId: 'no-infinite-loops',
        severity: 'warning'
      });
    }
  }

  private checkConfidenceRange(node: any): void {
    if (!this.isRuleEnabled('confidence-range')) return;

    let confidenceValue: number | undefined;
    
    // Handle different confidence value formats
    if (typeof node.confidence === 'number') {
      confidenceValue = node.confidence;
    } else if (node.confidence && node.confidence.type === 'NumberLiteral') {
      confidenceValue = node.confidence.value;
    }

    if (confidenceValue !== undefined) {
      if (confidenceValue < this.config.minConfidenceValue! || confidenceValue > this.config.maxConfidenceValue!) {
        const clampedValue = Math.max(this.config.minConfidenceValue!, Math.min(this.config.maxConfidenceValue!, confidenceValue));
        this.addResult({
          line: node.line || 1,
          column: node.column || 1,
          message: `Confidence value ${confidenceValue} is outside allowed range [${this.config.minConfidenceValue}, ${this.config.maxConfidenceValue}]`,
          ruleId: 'confidence-range',
          severity: 'error',
          fix: {
            description: `Clamp confidence to valid range`,
            replacement: `${clampedValue}`,
            startLine: node.line || 1,
            startColumn: node.column || 1,
            endLine: node.line || 1,
            endColumn: node.column || 1
          }
        });
      }
    }
  }

  private checkUncertainCompleteness(node: any): void {
    if (!this.isRuleEnabled('uncertain-completeness')) return;

    if (!node.branches) {
      this.addResult({
        line: node.line || 1,
        column: node.column || 1,
        message: 'Uncertain if statement has no confidence branches',
        ruleId: 'uncertain-completeness',
        severity: 'error',
        example: 'uncertain if (confidence > 0.5) {\n  high { result = "very confident" }\n  medium { result = "somewhat confident" }\n  low { result = "not confident" }\n}'
      });
      return;
    }

    const { high, medium, low, default: defaultBranch } = node.branches;
    const hasBranches = high || medium || low || defaultBranch;
    
    if (!hasBranches) {
      this.addResult({
        line: node.line || 1,
        column: node.column || 1,
        message: 'Uncertain if statement has no confidence branches',
        ruleId: 'uncertain-completeness',
        severity: 'error',
        example: 'uncertain if (confidence > 0.5) {\n  high { result = "very confident" }\n  medium { result = "somewhat confident" }\n  low { result = "not confident" }\n}'
      });
    } else if (!low && !defaultBranch) {
      this.addResult({
        line: node.line || 1,
        column: node.column || 1,
        message: 'Uncertain if statement missing low confidence branch or default branch',
        ruleId: 'uncertain-completeness',
        severity: 'warning',
        fix: {
          description: 'Add a low confidence branch or default branch',
          replacement: 'low { /* handle low confidence */ }',
          startLine: node.line || 1,
          startColumn: node.column || 1,
          endLine: node.line || 1,
          endColumn: node.column || 1
        }
      });
    }
  }

  private checkConstantCondition(node: any): void {
    if (!this.isRuleEnabled('no-constant-condition')) return;

    const test = node.condition || node.test;
    if (!test) return;

    if (test.type === 'BooleanLiteral' || 
        (test.type === 'NumberLiteral' && (test.value === 0 || test.value === 1))) {
      this.addResult({
        line: test.line || 1,
        column: test.column || 1,
        message: 'Condition is always ' + (test.value ? 'true' : 'false'),
        ruleId: 'no-constant-condition',
        severity: 'warning'
      });
    }
  }

  private checkVariableDeclaredBeforeUse(node: any, context: LintContext): void {
    if (!this.isRuleEnabled('variable-declared-before-use')) return;
    if (!context.declaredVars) return;

    const builtins = ['undefined', 'null', 'true', 'false', 'llm', 'map', 'filter', 'reduce', 'Math', 'console', 'print', 'doSomething', 'doNothing'];
    
    if (!builtins.includes(node.name) && !context.declaredVars.has(node.name)) {
      this.addResult({
        line: node.line || 1,
        column: node.column || 1,
        message: `Variable '${node.name}' used before declaration`,
        ruleId: 'variable-declared-before-use',
        severity: 'error'
      });
    }
  }

  private checkUnusedVariables(declared: Set<string>, used: Set<string>): void {
    if (!this.isRuleEnabled('no-unused-variables')) return;

    declared.forEach(varName => {
      if (!used.has(varName) && !varName.startsWith('_')) {
        this.addResult({
          line: 1,
          column: 1,
          message: `Variable '${varName}' is declared but never used`,
          ruleId: 'no-unused-variables',
          severity: 'warning',
          fix: {
            description: `Prefix with underscore to indicate intentionally unused`,
            replacement: `_${varName}`,
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 1
          }
        });
      }
    });
  }

  private checkConfidenceOperatorUsage(node: any): void {
    if (!this.isRuleEnabled('confidence-operator-usage')) return;

    if (node.type === 'UnaryExpression' && node.operator === '~') {
      if (node.operand && (node.operand.type === 'NumberLiteral' || node.operand.type === 'StringLiteral')) {
        this.addResult({
          line: node.line || 1,
          column: node.column || 1,
          message: 'Confidence operator ~ used on literal value',
          ruleId: 'confidence-operator-usage',
          severity: 'error'
        });
      }
    }
  }

  private checkDuplicateConfidenceBranches(node: any): void {
    if (!this.isRuleEnabled('no-duplicate-confidence-branches')) return;
    if (!node.branches) return;

    const branches = [];
    if (node.branches.high) branches.push({ level: 'high', body: node.branches.high });
    if (node.branches.medium) branches.push({ level: 'medium', body: node.branches.medium });
    if (node.branches.low) branches.push({ level: 'low', body: node.branches.low });
    if (node.branches.default) branches.push({ level: 'default', body: node.branches.default });

    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        if (this.areNodesEquivalent(branches[i].body, branches[j].body)) {
          this.addResult({
            line: branches[j].body.line || 1,
            column: branches[j].body.column || 1,
            message: `Duplicate code in ${branches[i].level} and ${branches[j].level} confidence branches`,
            ruleId: 'no-duplicate-confidence-branches',
            severity: 'warning'
          });
        }
      }
    }
  }

  private checkConfidenceInUncertain(node: any, context: LintContext): void {
    if (!this.isRuleEnabled('require-confidence-in-uncertain') || !this.config.requireConfidenceInUncertain) return;

    const hasConfidenceTest = this.nodeUsesConfidence(node.condition || node.test, context);
    
    if (!hasConfidenceTest) {
      this.addResult({
        line: node.line || 1,
        column: node.column || 1,
        message: 'Uncertain statement should use confidence values in test expression',
        ruleId: 'require-confidence-in-uncertain',
        severity: 'warning',
        example: 'uncertain if (~result > 0.7) { ... }'
      });
    }
  }

  private checkPreferConfidenceOperators(node: any, context: LintContext): void {
    if (!this.isRuleEnabled('prefer-confidence-operators')) return;

    if (node.operator === '>' || node.operator === '>=' || node.operator === '<' || node.operator === '<=') {
      if (this.nodeUsesConfidence(node.left, context) && !node.operator.startsWith('~')) {
        this.addResult({
          line: node.line || 1,
          column: node.column || 1,
          message: `Consider using confidence operator ~${node.operator} when comparing confidence values`,
          ruleId: 'prefer-confidence-operators',
          severity: 'info',
          fix: {
            description: `Use confidence operator`,
            replacement: `~${node.operator}`,
            startLine: node.line || 1,
            startColumn: node.column || 1,
            endLine: node.line || 1,
            endColumn: node.column || 1
          }
        });
      }
    }
  }

  private nodeUsesConfidence(node: any, context?: LintContext): boolean {
    if (!node) return false;

    switch (node.type) {
      case 'ConfidenceExpression':
        return true;
      case 'UnaryExpression':
        return node.operator === '~';
      case 'BinaryExpression':
        return node.operator === '@' || node.operator.startsWith('~');
      case 'CallExpression':
        return node.callee && node.callee.type === 'IdentifierExpression' && node.callee.name === 'llm';
      case 'IdentifierExpression':
        return context?.confidenceVars?.has(node.name) || false;
      default:
        return false;
    }
  }

  private areNodesEquivalent(a: any, b: any): boolean {
    if (!a || !b) return a === b;
    if (a.type !== b.type) return false;

    switch (a.type) {
      case 'BlockStatement':
        const aStmts = a.statements || a.body;
        const bStmts = b.statements || b.body;
        if (!aStmts || !bStmts || aStmts.length !== bStmts.length) return false;
        return aStmts.every((stmt: any, i: number) => this.areNodesEquivalent(stmt, bStmts[i]));
      
      case 'ExpressionStatement':
        return this.areNodesEquivalent(a.expression, b.expression);
      
      case 'AssignmentStatement':
        return a.identifier === b.identifier && this.areNodesEquivalent(a.value, b.value);
      
      case 'ReturnStatement':
        return this.areNodesEquivalent(a.argument, b.argument);
      
      case 'IdentifierExpression':
        return a.name === b.name;
      
      case 'NumberLiteral':
        return a.value === b.value;
      
      case 'StringLiteral':
        return a.value === b.value;
      
      case 'BooleanLiteral':
        return a.value === b.value;
      
      default:
        return false;
    }
  }

  private collectVariables(node: any, declared: Set<string>, used: Set<string>): void {
    if (!node) return;

    switch (node.type) {
      case 'Program':
        if (node.statements) {
          node.statements.forEach((stmt: any) => this.collectVariables(stmt, declared, used));
        }
        break;
      
      case 'AssignmentStatement':
        if (node.identifier) {
          declared.add(node.identifier);
        }
        if (node.value) {
          this.collectVariables(node.value, declared, used);
        }
        break;
      
      case 'IdentifierExpression':
        if (!['undefined', 'null', 'true', 'false', 'print', 'llm', 'map', 'filter', 'reduce'].includes(node.name)) {
          used.add(node.name);
        }
        break;
      
      case 'LambdaExpression':
        // Don't traverse into lambda expressions for variable collection
        // as they have their own scope
        break;
      
      default:
        Object.values(node).forEach(child => {
          if (child && typeof child === 'object') {
            if (Array.isArray(child)) {
              child.forEach(item => this.collectVariables(item, declared, used));
            } else if ((child as any).type) {
              this.collectVariables(child as any, declared, used);
            }
          }
        });
    }
  }

  private collectConfidenceVariables(node: any, confidenceVars: Set<string>): void {
    if (!node) return;

    switch (node.type) {
      case 'Program':
        if (node.statements) {
          node.statements.forEach((stmt: any) => this.collectConfidenceVariables(stmt, confidenceVars));
        }
        break;
      
      case 'AssignmentStatement':
        if (node.identifier && node.value) {
          if (this.valueHasConfidence(node.value)) {
            confidenceVars.add(node.identifier);
          }
          this.collectConfidenceVariables(node.value, confidenceVars);
        }
        break;
      
      default:
        // Recursively check child nodes
        Object.values(node).forEach(child => {
          if (child && typeof child === 'object') {
            if (Array.isArray(child)) {
              child.forEach(item => {
                if (item && typeof item === 'object' && item.type) {
                  this.collectConfidenceVariables(item as any, confidenceVars);
                }
              });
            } else if ((child as any).type) {
              this.collectConfidenceVariables(child as any, confidenceVars);
            }
          }
        });
    }
  }

  private valueHasConfidence(node: any): boolean {
    if (!node) return false;
    
    switch (node.type) {
      case 'ConfidenceExpression':
        return true;
      case 'CallExpression':
        return node.callee && node.callee.type === 'IdentifierExpression' && node.callee.name === 'llm';
      case 'UnaryExpression':
        return node.operator === '~';
      case 'BinaryExpression':
        return node.operator === '@' || node.operator.startsWith('~') || 
               this.valueHasConfidence(node.left) || this.valueHasConfidence(node.right);
      default:
        return false;
    }
  }

  private addResult(result: LintResult): void {
    this.results.push(result);
  }
}

interface LintContext {
  inFunction?: boolean;
  declaredVars?: Set<string>;
  usedVars?: Set<string>;
  uncertainDepth?: number;
  confidenceVars?: Set<string>;
}