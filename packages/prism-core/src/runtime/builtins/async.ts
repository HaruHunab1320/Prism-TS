import { RuntimeError } from '../errors';
import {
  Value,
  ConfidenceValue,
  ArrayValue,
  FunctionValue,
  NumberValue,
  StringValue,
  NullValue,
  PromiseValue,
  ObjectValue,
} from '../values';

type Registrar = (name: string, value: Value) => void;

export function registerAsyncBuiltins(register: Registrar): void {
  register('debounce', new FunctionValue('debounce', async (args) => {
    if (args.length !== 1) {
      throw new RuntimeError('debounce() requires exactly one argument: delay in milliseconds');
    }

    const delayArg = args[0];
    const delay = delayArg instanceof ConfidenceValue ? delayArg.value : delayArg;

    if (!(delay instanceof NumberValue)) {
      throw new RuntimeError('debounce() delay must be a number');
    }

    const delayMs = delay.value;

    return new FunctionValue('debouncer', async (debounceArgs) => {
      if (debounceArgs.length !== 1) {
        throw new RuntimeError('debounce creator requires exactly one argument: function');
      }

      const func = debounceArgs[0];
      if (!(func instanceof FunctionValue)) {
        throw new RuntimeError('debounce creator requires a function argument');
      }

      let timeoutId: NodeJS.Timeout | null = null;
      let lastResult: Value = new NullValue();

      return new FunctionValue('debouncedFunction', async (innerArgs) => {
        return new Promise<Value>((resolve) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          timeoutId = setTimeout(async () => {
            try {
              lastResult = await func.value(innerArgs);
              resolve(lastResult);
            } catch {
              resolve(new NullValue());
            }
          }, delayMs);
        });
      });
    });
  }));

  const promiseObj = new ObjectValue(new Map<string, Value>());

  promiseObj.value.set('resolve', new FunctionValue('Promise.resolve', async (args) => {
    if (args.length !== 1) {
      throw new RuntimeError('Promise.resolve() requires exactly one argument');
    }
    return new PromiseValue(Promise.resolve(args[0]));
  }));

  promiseObj.value.set('reject', new FunctionValue('Promise.reject', async (args) => {
    if (args.length !== 1) {
      throw new RuntimeError('Promise.reject() requires exactly one argument');
    }
    const errorMsg = args[0] instanceof StringValue ? args[0].value : args[0].toString();
    return new PromiseValue(Promise.reject(new StringValue(errorMsg)));
  }));

  promiseObj.value.set('all', new FunctionValue('Promise.all', async (args) => {
    if (args.length !== 1 || !(args[0] instanceof ArrayValue)) {
      throw new RuntimeError('Promise.all() requires an array of promises');
    }

    const promises = args[0].value;
    const results: Value[] = [];

    for (const promise of promises) {
      if (promise instanceof PromiseValue) {
        results.push(await promise.value);
      } else {
        results.push(promise);
      }
    }

    return new ArrayValue(results);
  }));

  register('Promise', promiseObj);

  const delayFunction = new FunctionValue('delay', async (args) => {
    if (args.length !== 1) {
      throw new RuntimeError('delay() requires exactly one argument: milliseconds');
    }

    const msArg = args[0];
    const ms = msArg instanceof ConfidenceValue ? msArg.value : msArg;

    if (!(ms instanceof NumberValue)) {
      throw new RuntimeError('delay() requires a number of milliseconds');
    }

    const delayMs = Math.floor(ms.value);

    return new PromiseValue(
      new Promise(resolve => {
        setTimeout(() => resolve(new NullValue()), delayMs);
      })
    );
  });

  register('delay', delayFunction);
  register('sleep', delayFunction);
}
