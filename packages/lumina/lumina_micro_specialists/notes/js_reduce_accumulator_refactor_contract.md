# Contract: `js_reduce_accumulator_refactor`

## Purpose

Transform a simple imperative JavaScript accumulator loop into an equivalent
`.reduce(...)` expression or assignment.

## User-visible task shape

Typical user prompts:

- "Refactor this loop to use `reduce`."
- "Rewrite this accumulator loop in a more functional style."
- "Convert this aggregation into `reduce`."

## Input contract

Input must contain:

- JavaScript code
- one loop iterating over one array
- one accumulator variable initialized before the loop
- one accumulator update per iteration

Allowed forms:

- numeric accumulation like sum / product
- string accumulation like concatenation
- object/record accumulation when the update is simple and deterministic

Allowed semantics:

- one accumulator variable
- pure update step
- initial value is explicit and stable

Disallowed forms:

- loops that mutate multiple accumulators
- conditional branching that changes accumulator type
- side effects beyond the accumulator
- async behavior
- updates that depend on external mutable state

## Output contract

Return only valid JavaScript.

Must:

- preserve behavior
- use `.reduce`
- preserve the expected output binding when possible
- avoid prose unless explicitly requested

Example output:

```js
const total = nums.reduce((acc, n) => acc + n, 0);
```

## Correctness contract

An answer is correct if all are true:

1. it parses as JavaScript
2. it uses `.reduce`
3. it preserves behavior on generated tests
4. it preserves the accumulator initial value semantics

## Confidence definition

`answer_confidence` means:

- estimated probability that the transformed program satisfies the
  `js_reduce_accumulator_refactor` contract and passes contract tests

## Control policy

Initial policy should match the first micro-specialist:

- route narrowly
- verify first
- return only verified outputs
- use learned confidence later for selective answering when residual failures are
  understood
