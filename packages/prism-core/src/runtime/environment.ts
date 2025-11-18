import { RuntimeError } from './errors';
import { Value } from './values';

interface VariableInfo {
  value: Value;
  mutable: boolean;
  declared: boolean;
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

  define(name: string, value: Value, mutable: boolean = true, declared: boolean = false): void {
    if (this.variables.has(name) && this.variables.get(name)!.declared) {
      throw new RuntimeError(`Variable '${name}' already declared in this scope`);
    }
    this.variables.set(name, { value, mutable, declared });
  }

  has(name: string): boolean {
    return Boolean(this.findEnvironment(name));
  }

  get(name: string): Value {
    const resolved = this.findEnvironment(name);
    if (!resolved) {
      throw new RuntimeError(`Undefined variable: ${name}`, undefined, undefined);
    }
    return resolved.info.value;
  }

  set(name: string, value: Value): void {
    const resolved = this.findEnvironment(name);
    if (!resolved) {
      throw new RuntimeError(`Undefined variable: ${name}`, undefined, undefined);
    }

    if (!resolved.info.mutable) {
      throw new RuntimeError(`Cannot assign to const variable '${name}'`);
    }

    resolved.env.variables.set(name, { ...resolved.info, value });
  }

  getAllVariables(): Map<string, Value> {
    const result = new Map<string, Value>();
    for (const [name, info] of this.variables) {
      result.set(name, info.value);
    }
    return result;
  }
}
