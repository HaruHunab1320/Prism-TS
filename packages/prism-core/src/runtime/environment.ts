import { RuntimeError } from './errors';
import { Value, NullValue } from './values';

interface VariableInfo {
  value: Value;
  mutable: boolean;
  declared: boolean;
  initialized: boolean;
}

export class Environment {
  private variables = new Map<string, VariableInfo>();

  constructor(private parent?: Environment) {}

  private findEnvironment(name: string): { env: Environment; info: VariableInfo } | undefined {
    if (this.variables.has(name)) {
      return { env: this, info: this.variables.get(name)! };
    }
    return this.parent?.findEnvironment(name);
  }

  declare(name: string, mutable: boolean = true): void {
    if (this.variables.has(name) && this.variables.get(name)!.declared) {
      throw new RuntimeError(`Variable '${name}' already declared in this scope`);
    }
    this.variables.set(name, { value: new NullValue(), mutable, declared: true, initialized: false });
  }

  define(name: string, value: Value, mutable: boolean = true, declared: boolean = false): void {
    const existing = this.variables.get(name);
    if (existing?.declared) {
      if (existing.initialized) {
        throw new RuntimeError(`Variable '${name}' already declared in this scope`);
      }
      this.variables.set(name, { value, mutable, declared: true, initialized: true });
      return;
    }
    this.variables.set(name, { value, mutable, declared, initialized: true });
  }

  has(name: string): boolean {
    return Boolean(this.findEnvironment(name));
  }

  get(name: string): Value {
    const resolved = this.findEnvironment(name);
    if (!resolved) {
      throw new RuntimeError(`Undefined variable: ${name}`, undefined, undefined);
    }
    if (!resolved.info.initialized) {
      throw new RuntimeError(`Cannot access '${name}' before initialization`);
    }
    return resolved.info.value;
  }

  set(name: string, value: Value): void {
    const resolved = this.findEnvironment(name);
    if (!resolved) {
      throw new RuntimeError(`Undefined variable: ${name}`, undefined, undefined);
    }
    if (!resolved.info.initialized) {
      throw new RuntimeError(`Cannot assign to '${name}' before initialization`);
    }

    if (!resolved.info.mutable) {
      throw new RuntimeError(`Cannot assign to const variable '${name}'`);
    }

    resolved.env.variables.set(name, { ...resolved.info, value, initialized: true });
  }

  getAllVariables(): Map<string, Value> {
    const result = new Map<string, Value>();
    for (const [name, info] of this.variables) {
      if (info.initialized) {
        result.set(name, info.value);
      }
    }
    return result;
  }
}
