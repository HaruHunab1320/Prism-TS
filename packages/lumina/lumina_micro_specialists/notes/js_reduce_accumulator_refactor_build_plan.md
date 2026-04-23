# Build Plan: `js_reduce_accumulator_refactor`

## Router rules (v1)

Use rules first.

Route to this contract only if all are true:

1. a JavaScript code block is present
2. the code contains:
   - one accumulator initialization before the loop
   - one `for` or `for...of` loop
   - one repeated accumulator update inside the loop
3. the user intent contains one of:
   - `reduce`
   - `refactor`
   - `rewrite`
   - `functional`
   - `idiomatic`
4. there is no obvious sign of:
   - multiple accumulators
   - conditional accumulation with branch-heavy semantics
   - external side effects

## Dataset schema

Each row should look like:

```json
{
  "id": "reduce_000123",
  "source": "synthetic|curated",
  "language": "javascript",
  "task_contract": "js_reduce_accumulator_refactor",
  "prompt": "Refactor this loop to use reduce:\\n```js\\n...\\n```",
  "input_code": "let total = 0; ...",
  "target_code": "const total = nums.reduce((acc, n) => acc + n, 0);",
  "input_pattern": "indexed_sum",
  "expected_output_var": "total",
  "expected_array_var": "nums",
  "expected_initial_value": "0",
  "tests": [
    {
      "input": [1, 2, 3],
      "expected_output": 6
    }
  ]
}
```

## Dataset composition

Start with:

- `60%` synthetic benchmark-shaped examples
- `20%` curated edge cases
- `20%` mutation-derived variants

Task buckets:

- numeric sum
- numeric product
- string concatenation
- object property accumulation where the final value is still scalar

Do not include:

- map-like one-to-one transforms
- filter
- side-effectful folds
- multi-output object builders
- async reduction

## Verifier design

Verifier stages:

1. parse check
2. contract check
   - `.reduce` present
   - expected binding present when required
   - initial value present and semantically aligned
3. behavior check
   - run original and transformed code on generated fixtures
   - compare final accumulator outputs

Behavior fixtures should cover:

- empty array
- one-element array
- typical array
- sign/edge cases for numeric accumulators

## Training recipe

Start the same way as `js_array_loop_to_map`:

- base model: `Qwen/Qwen2.5-Coder-1.5B-Instruct`
- contract-matched prompt
- cheap adapter-style partial fine-tune
- output code only

## Metrics

Primary:

- verified pass rate
- syntax-valid rate
- uses-reduce rate

Secondary:

- route precision
- learned-confidence `AUROC`
- threshold stability

## Promotion gate

Use the same gate as the first promoted micro-specialist:

- `+0.10` absolute verified pass-rate lift, or
- `>= 25%` relative error reduction

The point is not breadth. The point is a narrow verified win that justifies the
extra routing/control path.
