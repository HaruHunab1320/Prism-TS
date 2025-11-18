import { ConfidenceValue as ConfidenceLib } from '../../confidence';
import { RuntimeError } from '../errors';
import { ConfidenceValue, ArrayValue, ObjectValue, FunctionValue, NumberValue } from '../values';

type Registrar = (name: string, fn: FunctionValue) => void;

export function registerConfidenceBuiltins(register: Registrar): void {
  register('confidence', new FunctionValue('confidence', async (args) => {
    if (args.length !== 1) {
      throw new RuntimeError('confidence() requires exactly one argument: threshold');
    }

    const thresholdArg = args[0];
    const threshold = thresholdArg instanceof ConfidenceValue ? thresholdArg.value : thresholdArg;

    if (!(threshold instanceof NumberValue)) {
      throw new RuntimeError('confidence() threshold must be a number');
    }

    const thresholdVal = threshold.value;
    if (thresholdVal < 0 || thresholdVal > 1) {
      throw new RuntimeError('confidence() threshold must be between 0 and 1');
    }

    return new FunctionValue('confidenceThreshold', async (funcArgs) => {
      if (funcArgs.length !== 1) {
        throw new RuntimeError('confidence-configured function requires exactly one argument: function');
      }

      const func = funcArgs[0];
      if (!(func instanceof FunctionValue)) {
        throw new RuntimeError('confidence-configured function requires a function argument');
      }

      return new FunctionValue('confidenceWrapper', async (innerArgs) => {
        const result = await func.value(innerArgs);
        return new ConfidenceValue(result, new ConfidenceLib(thresholdVal));
      });
    });
  }));

  register('threshold', new FunctionValue('threshold', async (args) => {
    if (args.length !== 1) {
      throw new RuntimeError('threshold() requires exactly one argument: minimum confidence');
    }

    const thresholdArg = args[0];
    const threshold = thresholdArg instanceof ConfidenceValue ? thresholdArg.value : thresholdArg;

    if (!(threshold instanceof NumberValue)) {
      throw new RuntimeError('threshold() requires a number');
    }

    const thresholdVal = threshold.value;

    return new FunctionValue('thresholdFilter', async (filterArgs) => {
      if (filterArgs.length !== 1) {
        throw new RuntimeError('threshold filter requires exactly one argument: array');
      }

      const arrayArg = filterArgs[0];
      const array = arrayArg instanceof ConfidenceValue ? arrayArg.value : arrayArg;

      if (!(array instanceof ArrayValue)) {
        throw new RuntimeError('threshold filter requires an array');
      }

      const filtered = array.elements.filter(element => {
        if (element instanceof ConfidenceValue) {
          return element.confidence.value >= thresholdVal;
        }
        if (element instanceof ObjectValue) {
          for (const [, value] of element.properties) {
            if (value instanceof ConfidenceValue && value.confidence.value < thresholdVal) {
              return false;
            }
          }
        }
        return true;
      });

      return new ArrayValue(filtered);
    });
  }));
}
