import { ConfidenceValue as ConfidenceLib } from '../confidence';

export abstract class Value {
  abstract type: string;
  abstract value: unknown;
  abstract equals(other: Value): boolean;
  abstract isTruthy(): boolean;
  abstract toString(): string;
}

export class NumberValue extends Value {
  type = 'number';

  constructor(public value: number) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof NumberValue && other.value === this.value;
  }

  isTruthy(): boolean {
    return this.value !== 0;
  }

  toString(): string {
    return this.value.toString();
  }
}

export class StringValue extends Value {
  type = 'string';

  constructor(public value: string) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof StringValue && other.value === this.value;
  }

  isTruthy(): boolean {
    return this.value.length > 0;
  }

  toString(): string {
    return this.value;
  }
}

export class BooleanValue extends Value {
  type = 'boolean';

  constructor(public value: boolean) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof BooleanValue && other.value === this.value;
  }

  isTruthy(): boolean {
    return this.value;
  }

  toString(): string {
    return this.value.toString();
  }
}

export class NullValue extends Value {
  type = 'null';
  value = null;

  constructor() {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof NullValue;
  }

  isTruthy(): boolean {
    return false;
  }

  toString(): string {
    return 'null';
  }
}

export class ConfidenceValue extends Value {
  type = 'confident';

  constructor(
    public value: Value,
    public confidence: ConfidenceLib
  ) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof ConfidenceValue &&
           other.value.equals(this.value) &&
           other.confidence.equals(this.confidence);
  }

  isTruthy(): boolean {
    return this.value.isTruthy();
  }

  toString(): string {
    return `${this.value.toString()} (~${this.confidence.toString()})`;
  }
}

export class ArrayValue extends Value {
  type = 'array';
  value: Value[];

  constructor(public elements: Value[]) {
    super();
    this.value = elements;
  }

  equals(other: Value): boolean {
    if (!(other instanceof ArrayValue)) return false;
    if (this.elements.length !== other.elements.length) return false;
    return this.elements.every((elem, i) => elem.equals(other.elements[i]));
  }

  isTruthy(): boolean {
    return true;
  }

  toString(): string {
    return `[${this.elements.map(e => e.toString()).join(', ')}]`;
  }
}

export class ObjectValue extends Value {
  type = 'object';
  value: Map<string, Value>;

  constructor(public properties: Map<string, Value>) {
    super();
    this.value = properties;
  }

  equals(other: Value): boolean {
    if (!(other instanceof ObjectValue)) return false;
    if (this.properties.size !== other.properties.size) return false;

    for (const [key, value] of this.properties) {
      const otherValue = other.properties.get(key);
      if (!otherValue || !value.equals(otherValue)) return false;
    }
    return true;
  }

  isTruthy(): boolean {
    return true;
  }

  toString(): string {
    const props = Array.from(this.properties.entries())
      .map(([k, v]) => `${k}: ${v.toString()}`)
      .join(', ');
    return props.length > 0 ? `{ ${props} }` : '{}';
  }
}

export class FunctionValue extends Value {
  type = 'function';

  constructor(
    public name: string,
    public value: (args: Value[]) => Promise<Value>,
    public arity?: number
  ) {
    super();
  }

  equals(other: Value): boolean {
    return other instanceof FunctionValue && other.name === this.name;
  }

  isTruthy(): boolean {
    return true;
  }

  toString(): string {
    return `[Function: ${this.name}]`;
  }
}

export class PromiseValue extends Value {
  type = 'promise';

  constructor(public value: Promise<Value>) {
    super();
  }

  equals(_other: Value): boolean {
    return false; // Promises are never equal
  }

  isTruthy(): boolean {
    return true; // Promises are always truthy
  }

  toString(): string {
    return '[Promise]';
  }
}
