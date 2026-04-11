# Build Plan: `js_array_loop_to_map`

## Router rules (v1)

Use rules first, not a learned router.

Route to this contract only if all are true:

1. a JavaScript code block is present
2. the code contains:
   - a `for` loop or `for...of` loop
   - an output array variable
   - a `push(...)` call on that output array
3. the user intent contains one of:
   - `map`
   - `refactor`
   - `rewrite`
   - `functional`
   - `idiomatic`
4. there is no obvious sign of:
   - conditional push
   - aggregation
   - side-effectful writes beyond the output array

If any of those checks fail, use fallback instead of the specialist.

## Dataset schema

Each row should look like:

```json
{
  "id": "map_000123",
  "source": "synthetic|curated",
  "language": "javascript",
  "task_contract": "js_array_loop_to_map",
  "prompt": "Refactor this loop to use map:\\n```js\\n...\\n```",
  "input_code": "const out = []; ...",
  "target_code": "const out = arr.map((x) => ...);",
  "input_pattern": "indexed_push_loop",
  "expected_output_var": "out",
  "expected_array_var": "users",
  "callable": null,
  "tests": [
    {
      "name": "basic_case",
      "input_fixture": "...",
      "assertion": "..."
    }
  ]
}
```

## Dataset composition

Start with:

- `60%` synthetic benchmark-shaped examples
- `20%` curated hand-written edge cases
- `20%` mutation-derived variants from seed examples

Task buckets:

- indexed loop -> `.map`
- `for...of` loop -> `.map`
- property extraction
- expression transform
- object-literal transform
- nested member access

Do not include:

- filtering
- reduce
- async
- multiple output arrays
- control-flow-heavy loops

## Verifier design

Verifier stages:

1. parse check
   - parse transformed code as JavaScript
2. contract check
   - ensure `.map` is present
   - ensure output variable still exists when required
3. behavior check
   - run original and transformed code on generated fixtures
   - compare outputs

Behavior fixtures should cover:

- empty array
- one-element array
- typical array
- null-ish or missing nested field if original code implies such cases

## Training recipe

Start with:

- base model: strong code instruct model already known to work in Lumina
- adaptation: LoRA or similarly cheap adapter training
- prompt format: exactly the same as runtime strict contract
- output: code only

Minimal first recipe:

- small adapter, one contract only
- train until verifier-backed validation pass rate plateaus
- prefer exact contract match over broad data volume

## Metrics

Primary:

- verified pass rate
- syntax-valid rate

Secondary:

- route precision
- fallback rate
- confidence `AUROC` once a learned probe is added
- risk/coverage once selective policy is added

## Promotion gate

Promote only if the specialist beats the base model on the same contract by a
clear margin under verification, not just syntax or style.

For v1, a reasonable gate is:

- `+0.15` absolute verified pass-rate lift over the base model

If it does not clear that, the specialist is not worth the routing complexity.
