import { Validator } from './validator';
import { ConfidenceFlowAnalyzer } from './confidence-checker';
import { TypeAnalyzer } from './type-checker';
import { Linter } from './linter';
import { ErrorFormatter } from './error-formatter';
import { StreamingValidator } from './streaming';
import { 
  ValidationResult, 
  ParseResult, 
  ConfidenceFlowResult, 
  ConfidenceCompletenessResult,
  TypeCheckResult,
  LintResult,
  LinterConfig,
  ErrorMessage,
  StreamingValidationResult
} from './types';

export interface PrismValidationAPI {
  validate(code: string): ValidationResult;
  parse(code: string): ParseResult;
  checkConfidenceFlow(code: string): ConfidenceFlowResult;
  checkConfidenceCompleteness(code: string): ConfidenceCompletenessResult;
  checkTypes(code: string): TypeCheckResult;
  lint(code: string, config?: LinterConfig): LintResult[];
  validateAll(code: string, config?: LinterConfig): ComprehensiveValidationResult;
  validateStreaming(chunk: string): StreamingValidationResult;
  formatErrors(errors: any[]): ErrorMessage[];
}

export interface ComprehensiveValidationResult {
  valid: boolean;
  syntax: ValidationResult;
  confidence: {
    flow: ConfidenceFlowResult;
    completeness: ConfidenceCompletenessResult;
  };
  types: TypeCheckResult;
  lint: LintResult[];
  formattedErrors: ErrorMessage[];
  summary: string;
}

export class UnifiedValidator implements PrismValidationAPI {
  private validator: Validator;
  private confidenceChecker: ConfidenceFlowAnalyzer;
  private typeChecker: TypeAnalyzer;
  private linter: Linter;
  private streamingValidator: StreamingValidator;

  constructor(linterConfig?: LinterConfig) {
    this.validator = new Validator();
    this.confidenceChecker = new ConfidenceFlowAnalyzer();
    this.typeChecker = new TypeAnalyzer();
    this.linter = new Linter(linterConfig);
    this.streamingValidator = new StreamingValidator();
  }

  validate(code: string): ValidationResult {
    return this.validator.validate(code);
  }

  parse(code: string): ParseResult {
    return this.validator.parse(code);
  }

  checkConfidenceFlow(code: string): ConfidenceFlowResult {
    const parseResult = this.parse(code);
    if (!parseResult.ast) {
      return {
        valid: false,
        issues: [{
          line: 1,
          column: 1,
          message: 'Failed to parse code',
          code: 'PARSE_ERROR'
        }]
      };
    }
    return this.confidenceChecker.checkConfidenceFlow(parseResult.ast);
  }

  checkConfidenceCompleteness(code: string): ConfidenceCompletenessResult {
    const parseResult = this.parse(code);
    if (!parseResult.ast) {
      return {
        complete: false,
        missingPaths: []
      };
    }
    return this.confidenceChecker.checkConfidenceCompleteness(parseResult.ast);
  }

  checkTypes(code: string): TypeCheckResult {
    const parseResult = this.parse(code);
    if (!parseResult.ast) {
      return {
        valid: false,
        errors: [{
          line: 1,
          column: 1,
          message: 'Failed to parse code',
          code: 'PARSE_ERROR'
        }]
      };
    }
    return this.typeChecker.checkTypes(parseResult.ast);
  }

  lint(code: string, config?: LinterConfig): LintResult[] {
    return this.linter.lint(code, config);
  }

  validateAll(code: string, config?: LinterConfig): ComprehensiveValidationResult {
    const syntax = this.validate(code);
    const parseResult = this.parse(code);
    
    let confidenceFlow: ConfidenceFlowResult = { valid: true, issues: [] };
    let confidenceCompleteness: ConfidenceCompletenessResult = { complete: true, missingPaths: [] };
    let types: TypeCheckResult = { valid: true, errors: [] };
    let lint: LintResult[] = [];

    if (parseResult.ast) {
      confidenceFlow = this.confidenceChecker.checkConfidenceFlow(parseResult.ast);
      confidenceCompleteness = this.confidenceChecker.checkConfidenceCompleteness(parseResult.ast);
      types = this.typeChecker.checkTypes(parseResult.ast);
      lint = this.linter.lint(code, config);
    }

    const allErrors = [
      ...syntax.errors,
      ...confidenceFlow.issues,
      ...types.errors,
      ...lint
    ];

    const formattedErrors = this.formatErrors(allErrors);
    const summary = this.generateSummary(syntax, confidenceFlow, confidenceCompleteness, types, lint);

    const valid = syntax.valid && 
                  confidenceFlow.valid && 
                  confidenceCompleteness.complete && 
                  types.valid && 
                  lint.filter(l => l.severity === 'error').length === 0;

    return {
      valid,
      syntax,
      confidence: {
        flow: confidenceFlow,
        completeness: confidenceCompleteness
      },
      types,
      lint,
      formattedErrors,
      summary
    };
  }

  validateStreaming(chunk: string): StreamingValidationResult {
    return this.streamingValidator.validatePartial(chunk);
  }

  resetStreaming(): void {
    this.streamingValidator.reset();
  }

  getStreamingCompletions(): string[] {
    return this.streamingValidator.getCompletions();
  }

  isStreamingComplete(): boolean {
    return this.streamingValidator.isComplete();
  }

  formatErrors(errors: any[]): ErrorMessage[] {
    return ErrorFormatter.formatMultipleErrors(errors);
  }

  private generateSummary(
    syntax: ValidationResult,
    flow: ConfidenceFlowResult,
    completeness: ConfidenceCompletenessResult,
    types: TypeCheckResult,
    lint: LintResult[]
  ): string {
    const issues: string[] = [];
    
    if (!syntax.valid) {
      issues.push(`${syntax.errors.length} syntax error${syntax.errors.length > 1 ? 's' : ''}`);
    }
    
    if (!flow.valid) {
      issues.push(`${flow.issues.length} confidence flow issue${flow.issues.length > 1 ? 's' : ''}`);
    }
    
    if (!completeness.complete) {
      issues.push(`${completeness.missingPaths.length} missing confidence path${completeness.missingPaths.length > 1 ? 's' : ''}`);
    }
    
    if (!types.valid) {
      issues.push(`${types.errors.length} type error${types.errors.length > 1 ? 's' : ''}`);
    }
    
    const lintErrors = lint.filter(l => l.severity === 'error').length;
    const lintWarnings = lint.filter(l => l.severity === 'warning').length;
    
    if (lintErrors > 0) {
      issues.push(`${lintErrors} lint error${lintErrors > 1 ? 's' : ''}`);
    }
    
    if (lintWarnings > 0) {
      issues.push(`${lintWarnings} lint warning${lintWarnings > 1 ? 's' : ''}`);
    }
    
    if (issues.length === 0) {
      return 'Code is valid with no issues found';
    }
    
    const fixSuggestion = ErrorFormatter.generateFixSuggestion(this.formatErrors([
      ...syntax.errors,
      ...flow.issues,
      ...types.errors,
      ...lint
    ]));
    
    return `Found ${issues.join(', ')}. ${fixSuggestion}`;
  }
}

export function createValidator(config?: LinterConfig): PrismValidationAPI {
  return new UnifiedValidator(config);
}