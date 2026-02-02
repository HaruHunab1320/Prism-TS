import { ConfidenceValue as ConfidenceLib } from '../../confidence';
import { RuntimeError } from '../errors';
import { ConfidenceValue, ArrayValue, ObjectValue, FunctionValue, NumberValue, StringValue } from '../values';

type Registrar = (name: string, fn: FunctionValue) => void;
export type ConfidenceCombineMode = 'min' | 'max' | 'product' | 'average';

interface ConfidenceBuiltinsOptions {
  createConfidenceValue?: (value: any, confidence: ConfidenceLib, rule: string, inputs: number[]) => ConfidenceValue;
}

export function registerConfidenceBuiltins(register: Registrar, options?: ConfidenceBuiltinsOptions): void {
  const createConfidence = options?.createConfidenceValue ?? ((value, confidence) => new ConfidenceValue(value, confidence));

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
        return createConfidence(result, new ConfidenceLib(thresholdVal), 'confidence()', [thresholdVal]);
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

  register('consensus', new FunctionValue('consensus', async (args) => {
    if (args.length < 1 || args.length > 2) {
      throw new RuntimeError('consensus() requires an array and optional options object');
    }

    const valuesArg = args[0] instanceof ConfidenceValue ? args[0].value : args[0];
    if (!(valuesArg instanceof ArrayValue)) {
      throw new RuntimeError('consensus() expects an array of values');
    }

    let strategy: 'max' | 'min' = 'max';
    if (args[1]) {
      const optionsArg = args[1] instanceof ConfidenceValue ? args[1].value : args[1];
      if (!(optionsArg instanceof ObjectValue)) {
        throw new RuntimeError('consensus() options must be an object');
      }
      const strategyValue = optionsArg.properties.get('strategy');
      if (strategyValue) {
        const raw = strategyValue instanceof ConfidenceValue ? strategyValue.value : strategyValue;
        if (!(raw instanceof StringValue)) {
          throw new RuntimeError('consensus() strategy must be a string');
        }
        if (raw.value === 'min' || raw.value === 'max') {
          strategy = raw.value;
        } else {
          throw new RuntimeError('consensus() strategy must be "min" or "max"');
        }
      }
    }

    if (valuesArg.elements.length === 0) {
      throw new RuntimeError('consensus() requires at least one value');
    }

    let best = valuesArg.elements[0];
    let bestConf = best instanceof ConfidenceValue ? best.confidence.value : 1.0;

    for (const element of valuesArg.elements.slice(1)) {
      const elementConf = element instanceof ConfidenceValue ? element.confidence.value : 1.0;
      const isBetter = strategy === 'max' ? elementConf > bestConf : elementConf < bestConf;
      if (isBetter) {
        best = element;
        bestConf = elementConf;
      }
    }

    return best;
  }));

  register('aggregate', new FunctionValue('aggregate', async (args) => {
    if (args.length < 1 || args.length > 2) {
      throw new RuntimeError('aggregate() requires an array and optional options object');
    }

    const valuesArg = args[0] instanceof ConfidenceValue ? args[0].value : args[0];
    if (!(valuesArg instanceof ArrayValue)) {
      throw new RuntimeError('aggregate() expects an array of values');
    }

    let strategy: ConfidenceCombineMode = 'average';
    let combineFn: FunctionValue | undefined;
    if (args[1]) {
      const optionsArg = args[1] instanceof ConfidenceValue ? args[1].value : args[1];
      if (!(optionsArg instanceof ObjectValue)) {
        throw new RuntimeError('aggregate() options must be an object');
      }
      const strategyValue = optionsArg.properties.get('strategy');
      if (strategyValue) {
        const raw = strategyValue instanceof ConfidenceValue ? strategyValue.value : strategyValue;
        if (!(raw instanceof StringValue)) {
          throw new RuntimeError('aggregate() strategy must be a string');
        }
        const mode = raw.value;
        if (mode === 'min' || mode === 'max' || mode === 'product' || mode === 'average') {
          strategy = mode;
        } else {
          throw new RuntimeError('aggregate() strategy must be "min", "max", "product", or "average"');
        }
      }
      const combineValue = optionsArg.properties.get('combine');
      if (combineValue) {
        const raw = combineValue instanceof ConfidenceValue ? combineValue.value : combineValue;
        if (!(raw instanceof FunctionValue)) {
          throw new RuntimeError('aggregate() combine must be a function');
        }
        combineFn = raw;
      }
    }

    const confidences = valuesArg.elements.map(element =>
      element instanceof ConfidenceValue ? element.confidence.value : 1.0
    );
    let combined = 1.0;
    if (confidences.length === 0) {
      combined = 1.0;
    } else if (strategy === 'min') {
      combined = Math.min(...confidences);
    } else if (strategy === 'max') {
      combined = Math.max(...confidences);
    } else if (strategy === 'product') {
      combined = confidences.reduce((acc, v) => acc * v, 1.0);
    } else {
      combined = confidences.reduce((acc, v) => acc + v, 0) / confidences.length;
    }

    let combinedValue: any = new ArrayValue(valuesArg.elements);
    if (combineFn) {
      combinedValue = await combineFn.value([new ArrayValue(valuesArg.elements)]);
    }

    return createConfidence(combinedValue, new ConfidenceLib(combined), 'aggregate()', confidences);
  }));
}
