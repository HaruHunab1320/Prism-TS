export type ContextProperties = Record<string, unknown>;
export type ContextVariables = Record<string, unknown>;

export interface TransitionOptions {
  preserveState?: boolean;
  validationRules?: string[];
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  newContext?: Context;
  preservedState?: ContextVariables;
}

export type ValidationRule = (from: Context | undefined, to: Context | undefined) => boolean;

export class ContextError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ContextError';
  }
}

export class Context {
  private scopes: ContextScope[] = [];

  constructor(
    public readonly name: string,
    public readonly properties: ContextProperties = {},
    public readonly parent?: Context
  ) {}

  // Property inheritance from parent contexts
  getInheritedProperty(key: string): unknown {
    if (key in this.properties) {
      return this.properties[key];
    }
    
    if (this.parent) {
      return this.parent.getInheritedProperty(key);
    }
    
    return undefined;
  }

  // Context compatibility checking
  isCompatibleWith(other: Context): boolean {
    // Basic compatibility: same domain or related contexts
    const thisDomain = this.getInheritedProperty('domain');
    const otherDomain = other.getInheritedProperty('domain');
    
    if (thisDomain && otherDomain) {
      return thisDomain === otherDomain;
    }
    
    // If no domain specified, contexts are compatible
    return true;
  }

  // Create a new scope within this context
  createScope(variables: ContextVariables = {}): ContextScope {
    const scope = new ContextScope(this, variables);
    this.scopes.push(scope);
    return scope;
  }

  // Get all scopes in this context
  getScopes(): ContextScope[] {
    return [...this.scopes];
  }

  // Remove a scope
  removeScope(scope: ContextScope): boolean {
    const index = this.scopes.indexOf(scope);
    if (index >= 0) {
      this.scopes.splice(index, 1);
      return true;
    }
    return false;
  }

  toString(): string {
    const parentPath = this.parent ? `${this.parent.toString()}.` : '';
    return `${parentPath}${this.name}`;
  }
}

export class ContextScope {
  constructor(
    public readonly context: Context,
    public readonly variables: ContextVariables = {}
  ) {}

  getVariable(name: string): unknown {
    return this.variables[name];
  }

  setVariable(name: string, value: unknown): void {
    this.variables[name] = value;
  }

  hasVariable(name: string): boolean {
    return name in this.variables;
  }

  getAllVariables(): ContextVariables {
    return { ...this.variables };
  }
}

export class ContextStack {
  private stack: Context[] = [];

  push(context: Context): void {
    this.stack.push(context);
  }

  pop(): Context {
    const context = this.stack.pop();
    if (!context) {
      throw new ContextError('Cannot pop from empty context stack', 'STACK_UNDERFLOW');
    }
    return context;
  }

  current(): Context | undefined {
    return this.stack[this.stack.length - 1];
  }

  depth(): number {
    return this.stack.length;
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }

  findContext(name: string): Context | undefined {
    return this.stack.find(ctx => ctx.name === name);
  }

  getContextPath(): string[] {
    return this.stack.map(ctx => ctx.name);
  }

  clear(): void {
    this.stack.length = 0;
  }
}

export class ContextTransition {
  constructor(
    public readonly from: Context,
    public readonly to: Context,
    public readonly options: TransitionOptions = {}
  ) {}

  isValid(): boolean {
    // Basic validation: check context compatibility
    return this.from.isCompatibleWith(this.to);
  }

  execute(): TransitionResult {
    if (!this.isValid()) {
      return {
        success: false,
        error: `Invalid transition from ${this.from.name} to ${this.to.name}`,
      };
    }

    const result: TransitionResult = {
      success: true,
      newContext: this.to,
    };

    // Preserve state if requested
    if (this.options.preserveState) {
      const scopes = this.from.getScopes();
      if (scopes.length > 0) {
        const preservedState: ContextVariables = {};
        scopes.forEach(scope => {
          Object.assign(preservedState, scope.getAllVariables());
        });
        result.preservedState = preservedState;
      }
    }

    return result;
  }
}

export class ContextValidator {
  constructor(private rules: ValidationRule[] = []) {}

  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  validateTransition(from: Context | undefined, to: Context | undefined): void {
    for (const rule of this.rules) {
      if (!rule(from, to)) {
        throw new ContextError(
          `Context transition validation failed: ${from?.name} -> ${to?.name}`,
          'VALIDATION_FAILED'
        );
      }
    }
  }

  removeRule(rule: ValidationRule): boolean {
    const index = this.rules.indexOf(rule);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }
}

export class ContextManager {
  private contexts = new Map<string, Context>();
  private stack = new ContextStack();
  private validator?: ContextValidator;

  registerContext(context: Context): void {
    this.contexts.set(context.name, context);
  }

  getContext(name: string): Context | undefined {
    return this.contexts.get(name);
  }

  getAllContexts(): Context[] {
    return Array.from(this.contexts.values());
  }

  getCurrentContext(): Context | undefined {
    return this.stack.current();
  }

  enterContext(name: string): void {
    const context = this.getContext(name);
    if (!context) {
      throw new ContextError(`Context '${name}' not found`, 'CONTEXT_NOT_FOUND');
    }

    const current = this.getCurrentContext();
    if (this.validator) {
      this.validator.validateTransition(current, context);
    }

    this.stack.push(context);
  }

  exitContext(): Context | undefined {
    if (this.stack.isEmpty()) {
      return undefined;
    }
    return this.stack.pop();
  }

  switchContext(name: string): void {
    const context = this.getContext(name);
    if (!context) {
      throw new ContextError(`Context '${name}' not found`, 'CONTEXT_NOT_FOUND');
    }

    const current = this.getCurrentContext();
    if (this.validator) {
      this.validator.validateTransition(current, context);
    }

    if (!this.stack.isEmpty()) {
      this.stack.pop();
    }
    this.stack.push(context);
  }

  executeInContext<T>(contextName: string, operation: () => T): T {
    const context = this.getContext(contextName);
    if (!context) {
      throw new ContextError(`Context '${contextName}' not found`, 'CONTEXT_NOT_FOUND');
    }

    const wasInContext = !this.stack.isEmpty();
    this.enterContext(contextName);
    
    try {
      return operation();
    } finally {
      this.exitContext();
      if (!wasInContext && !this.stack.isEmpty()) {
        this.stack.clear();
      }
    }
  }

  setValidator(validator: ContextValidator): void {
    this.validator = validator;
  }

  getValidator(): ContextValidator | undefined {
    return this.validator;
  }

  getContextStack(): ContextStack {
    return this.stack;
  }
}

// Interface for context-aware objects
export interface ContextAware {
  getCurrentContext(): Context | undefined;
  setContext(context: Context): void;
  inContext<T>(context: Context, operation: () => T): T;
}

// Utility functions
export function createContext(name: string, properties: ContextProperties = {}): Context {
  return new Context(name, properties);
}

export function withContext<T>(context: Context, operation: (ctx: Context) => T): T {
  return operation(context);
}

// Context-aware base class
export abstract class ContextAwareBase implements ContextAware {
  private currentContext?: Context;

  getCurrentContext(): Context | undefined {
    return this.currentContext;
  }

  setContext(context: Context): void {
    this.currentContext = context;
  }

  inContext<T>(context: Context, operation: () => T): T {
    const previous = this.currentContext;
    this.currentContext = context;
    try {
      return operation();
    } finally {
      this.currentContext = previous;
    }
  }
}

// Default context manager instance
export const defaultContextManager = new ContextManager();