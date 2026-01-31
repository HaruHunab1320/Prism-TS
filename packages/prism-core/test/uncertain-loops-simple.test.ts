import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { NumberValue, StringValue } from '../src/runtime';

describe('Uncertain Loop Basic Test', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  const execute = async (code: string) => {
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    const ast = parser.parse();
    return runtime.execute(ast);
  };

  it('should execute uncertain for loop with high confidence', async () => {
    const code = `
      let count = 0
      uncertain for let i = 0; i < 3; i = i + 1 {
        high {
          count = count + 1
        }
        medium {
          count = count + 10
        }
        low {
          count = count + 100
        }
      }
      count
    `;
    const result = await execute(code);
    expect(result).toBeInstanceOf(NumberValue);
    expect((result as NumberValue).value).toBe(3); // High confidence executes 3 times
  });

  it('should execute uncertain while loop based on confidence', async () => {
    const code = `
      let result = ""
      let i = 0
      uncertain while (i < 2) ~> 0.8 {
        high {
          result = result + "H"
          i = i + 1
        }
        medium {
          result = result + "M"
          i = i + 1
        }
        low {
          result = result + "L"
          i = i + 1
        }
      }
      result
    `;
    const result = await execute(code);
    expect(result).toBeInstanceOf(StringValue);
    expect((result as StringValue).value).toBe("HH"); // High confidence (0.8 >= 0.7)
  });
});