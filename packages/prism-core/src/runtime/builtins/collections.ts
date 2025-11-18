import { ConfidenceValue as ConfidenceLib } from '../../confidence';
import { RuntimeError } from '../errors';
import {
  Value,
  ConfidenceValue,
  ArrayValue,
  ObjectValue,
  FunctionValue,
  NumberValue,
  UndefinedValue,
  StringValue,
} from '../values';

type Registrar = (name: string, value: Value) => void;

export function registerCollectionBuiltins(register: Registrar): void {
  register('sortBy', new FunctionValue('sortBy', async (args) => {
    if (args.length < 1 || args.length > 2) {
      throw new RuntimeError('sortBy() requires 1-2 arguments: key [, direction]');
    }

    const keyArg = args[0];
    const key = keyArg instanceof ConfidenceValue ? keyArg.value : keyArg;

    if (!(key instanceof StringValue)) {
      throw new RuntimeError('sortBy() key must be a string');
    }

    const direction = args.length === 2 ? args[1] : new StringValue('asc');
    const dirValue = direction instanceof ConfidenceValue ? direction.value : direction;

    if (!(dirValue instanceof StringValue)) {
      throw new RuntimeError('sortBy() direction must be a string');
    }

    const isAscending = dirValue.value === 'asc';
    const keyName = key.value;

    return new FunctionValue('sorter', async (sortArgs) => {
      if (sortArgs.length !== 1) {
        throw new RuntimeError('sortBy sorter requires exactly one argument: array');
      }

      const arrayArg = sortArgs[0];
      const array = arrayArg instanceof ConfidenceValue ? arrayArg.value : arrayArg;

      if (!(array instanceof ArrayValue)) {
        throw new RuntimeError('sortBy sorter requires an array');
      }

      const sorted = [...array.elements].sort((a, b) => {
        let aVal = a instanceof ConfidenceValue ? a.value : a;
        let bVal = b instanceof ConfidenceValue ? b.value : b;

        if (aVal instanceof ObjectValue && bVal instanceof ObjectValue) {
          const aProp = aVal.properties.get(keyName);
          const bProp = bVal.properties.get(keyName);

          if (!aProp || !bProp) {
            aVal = aProp ? (aProp instanceof ConfidenceValue ? aProp.value : aProp) : new UndefinedValue();
            bVal = bProp ? (bProp instanceof ConfidenceValue ? bProp.value : bProp) : new UndefinedValue();
          } else {
            aVal = aProp instanceof ConfidenceValue ? aProp.value : aProp;
            bVal = bProp instanceof ConfidenceValue ? bProp.value : bProp;
          }
        }

        let comparison = 0;
        if (aVal instanceof NumberValue && bVal instanceof NumberValue) {
          comparison = aVal.value - bVal.value;
        } else {
          comparison = aVal.toString().localeCompare(bVal.toString());
        }

        return isAscending ? comparison : -comparison;
      });

      return new ConfidenceValue(new ArrayValue(sorted), new ConfidenceLib(0.95));
    });
  }));

  register('groupBy', new FunctionValue('groupBy', async (args) => {
    if (args.length !== 1) {
      throw new RuntimeError('groupBy() requires exactly one argument: key or function');
    }

    const keyOrFunc = args[0];

    return new FunctionValue('grouper', async (groupArgs) => {
      if (groupArgs.length !== 1) {
        throw new RuntimeError('groupBy grouper requires exactly one argument: array');
      }

      const arrayArg = groupArgs[0];
      const array = arrayArg instanceof ConfidenceValue ? arrayArg.value : arrayArg;

      if (!(array instanceof ArrayValue)) {
        throw new RuntimeError('groupBy grouper requires an array');
      }

      const groups = new Map<string, Value[]>();

      for (const element of array.elements) {
        let groupKey: string;

        if (keyOrFunc instanceof StringValue) {
          const obj = element instanceof ConfidenceValue ? element.value : element;
          if (obj instanceof ObjectValue) {
            const prop = obj.properties.get(keyOrFunc.value);
            groupKey = prop ? prop.toString() : 'undefined';
          } else {
            groupKey = obj.toString();
          }
        } else if (keyOrFunc instanceof FunctionValue) {
          const result = await keyOrFunc.value([element]);
          groupKey = result.toString();
        } else {
          throw new RuntimeError('groupBy() requires a string key or function');
        }

        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(element);
      }

      const resultObj = new Map<string, Value>();
      for (const [key, values] of groups) {
        resultObj.set(key, new ArrayValue(values));
      }

      return new ObjectValue(resultObj);
    });
  }));
}
