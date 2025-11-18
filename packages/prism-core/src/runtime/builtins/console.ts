import {
  Value,
  ConfidenceValue,
  ObjectValue,
  FunctionValue,
  UndefinedValue,
} from '../values';

type Registrar = (name: string, fn: FunctionValue | ObjectValue) => void;

function formatArgs(args: Value[]): string {
  return args.map(arg => {
    const value = arg instanceof ConfidenceValue ? arg.value : arg;
    if (arg instanceof ConfidenceValue) {
      return `${value.toString()} ~> ${arg.confidence.value.toFixed(2)}`;
    }
    return value.toString();
  }).join(' ');
}

export function registerConsoleBuiltins(register: Registrar): void {
  register('print', new FunctionValue('print', async (args) => {
    console.log(formatArgs(args));
    return new UndefinedValue();
  }));

  const consoleObject = new Map<string, Value>();
  consoleObject.set('log', new FunctionValue('log', async (args) => {
    console.log(formatArgs(args));
    return new UndefinedValue();
  }));
  consoleObject.set('warn', new FunctionValue('warn', async (args) => {
    console.warn(formatArgs(args));
    return new UndefinedValue();
  }));
  consoleObject.set('error', new FunctionValue('error', async (args) => {
    console.error(formatArgs(args));
    return new UndefinedValue();
  }));
  consoleObject.set('debug', new FunctionValue('debug', async (args) => {
    console.debug(`[DEBUG] ${formatArgs(args)}`);
    return new UndefinedValue();
  }));

  register('console', new ObjectValue(consoleObject));
}
