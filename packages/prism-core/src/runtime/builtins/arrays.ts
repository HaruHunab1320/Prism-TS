import { ConfidenceValue as ConfidenceLib } from '../../confidence';
import { RuntimeError } from '../errors';
import {
  Value,
  ConfidenceValue,
  ArrayValue,
  FunctionValue,
  NumberValue,
} from '../values';

type BuiltinRegistrar = (name: string, fn: FunctionValue) => void;

export function registerArrayBuiltins(register: BuiltinRegistrar): void {
  register('map', new FunctionValue('map', async (args) => {
    if (args.length !== 2) {
      throw new RuntimeError('map() requires exactly 2 arguments: array and function');
    }

    const arrayArg = args[0];
    const fnArg = args[1];

    const array = arrayArg instanceof ConfidenceValue ? arrayArg.value : arrayArg;
    const confidence = arrayArg instanceof ConfidenceValue ? arrayArg.confidence : new ConfidenceLib(1.0);

    if (!(array instanceof ArrayValue)) {
      throw new RuntimeError('First argument to map() must be an array');
    }

    if (!(fnArg instanceof FunctionValue)) {
      throw new RuntimeError('Second argument to map() must be a function');
    }

    const results: Value[] = [];
    for (const element of array.elements) {
      const result = await fnArg.value([element]);
      results.push(result);
    }

    const resultArray = new ArrayValue(results);
    return arrayArg instanceof ConfidenceValue 
      ? new ConfidenceValue(resultArray, confidence)
      : resultArray;
  }));

  register('filter', new FunctionValue('filter', async (args) => {
    if (args.length !== 2) {
      throw new RuntimeError('filter() requires exactly 2 arguments: array and predicate');
    }

    const arrayArg = args[0];
    const predicateArg = args[1];

    const array = arrayArg instanceof ConfidenceValue ? arrayArg.value : arrayArg;
    const confidence = arrayArg instanceof ConfidenceValue ? arrayArg.confidence : new ConfidenceLib(1.0);

    if (!(array instanceof ArrayValue)) {
      throw new RuntimeError('First argument to filter() must be an array');
    }

    if (!(predicateArg instanceof FunctionValue)) {
      throw new RuntimeError('Second argument to filter() must be a function');
    }

    const results: Value[] = [];
    for (const element of array.elements) {
      const predicateResult = await predicateArg.value([element]);
      if (predicateResult.isTruthy()) {
        results.push(element);
      }
    }

    const resultArray = new ArrayValue(results);
    return arrayArg instanceof ConfidenceValue 
      ? new ConfidenceValue(resultArray, confidence)
      : resultArray;
  }));

  register('reduce', new FunctionValue('reduce', async (args) => {
    if (args.length < 2 || args.length > 3) {
      throw new RuntimeError('reduce() requires 2 or 3 arguments: array, reducer, and optional initial value');
    }

    const arrayArg = args[0];
    const reducerArg = args[1];
    const initialValue = args.length === 3 ? args[2] : undefined;

    const array = arrayArg instanceof ConfidenceValue ? arrayArg.value : arrayArg;
    const confidence = arrayArg instanceof ConfidenceValue ? arrayArg.confidence : new ConfidenceLib(1.0);

    if (!(array instanceof ArrayValue)) {
      throw new RuntimeError('First argument to reduce() must be an array');
    }

    if (!(reducerArg instanceof FunctionValue)) {
      throw new RuntimeError('Second argument to reduce() must be a function');
    }

    if (array.elements.length === 0 && initialValue === undefined) {
      throw new RuntimeError('reduce() of empty array with no initial value');
    }

    let accumulator: Value;
    let startIndex: number;

    if (initialValue !== undefined) {
      accumulator = initialValue;
      startIndex = 0;
    } else {
      accumulator = array.elements[0];
      startIndex = 1;
    }

    for (let i = startIndex; i < array.elements.length; i++) {
      const args = [accumulator, array.elements[i]];
      if (reducerArg.arity === 3) {
        args.push(new NumberValue(i));
      }
      accumulator = await reducerArg.value(args);
    }

    return arrayArg instanceof ConfidenceValue && !(accumulator instanceof ConfidenceValue)
      ? new ConfidenceValue(accumulator, confidence)
      : accumulator;
  }));
}
