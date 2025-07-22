import { ASTNode } from '@prism-lang/core';

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error';
}

export interface Warning {
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'warning';
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
  code: string;
  token?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: SyntaxError[];
  warnings: Warning[];
}

export interface ParseResult {
  ast?: ASTNode;
  errors: ParseError[];
}

export interface ConfidenceIssue {
  line: number;
  column: number;
  message: string;
  code: string;
  variableName?: string;
  suggestion?: string;
}

export interface CodePath {
  startLine: number;
  endLine: number;
  description: string;
  missingConfidence: boolean;
}

export interface ConfidenceFlowResult {
  valid: boolean;
  issues: ConfidenceIssue[];
}

export interface ConfidenceCompletenessResult {
  complete: boolean;
  missingPaths: CodePath[];
}

export interface TypeError {
  line: number;
  column: number;
  message: string;
  code: string;
  expectedType?: string;
  actualType?: string;
}

export interface TypeCheckResult {
  valid: boolean;
  errors: TypeError[];
}

export interface LintRule {
  id: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface LintResult {
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  fix?: LintFix;
  example?: string;
}

export interface LintFix {
  description: string;
  replacement: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface LinterConfig {
  rules: Record<string, boolean | LintRule>;
  maxConfidenceValue?: number;
  minConfidenceValue?: number;
  requireConfidenceInUncertain?: boolean;
  allowInfiniteLoops?: boolean;
}

export interface ErrorMessage {
  error: string;
  line: number;
  column?: number;
  message: string;
  fix?: string;
  example?: string;
  suggestion?: string;
}

export interface StreamingValidationResult {
  valid: boolean;
  errors: SyntaxError[];
  warnings: Warning[];
  isPartial: boolean;
  expectedNext?: string[];
}