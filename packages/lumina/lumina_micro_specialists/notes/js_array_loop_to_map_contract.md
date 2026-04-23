# Contract: `js_array_loop_to_map`

## Purpose

Transform a simple imperative JavaScript array loop into an equivalent `.map`
expression or `.map`-based assignment.

## User-visible task shape

Typical user prompts:

- "Refactor this loop to use `map`."
- "Rewrite this array transform in a more idiomatic functional style."
- "Convert this push loop into `map`."

## Input contract

Input must contain:

- JavaScript code
- a loop iterating over one array
- an output array built by pushing one transformed value per iteration

Allowed forms:

- `for (let i = 0; i < arr.length; i++)`
- `for (const x of arr)` if the behavior is still one output per input element

Allowed semantics:

- pure transformation
- one output element per input element
- callback body expressible as a single expression or a simple return block

Disallowed forms:

- filtering
- reduction / aggregation
- early returns or breaks
- side effects beyond the output array write
- async behavior
- mutation of external state
- loops that push conditionally

## Output contract

Return only valid JavaScript.

Must:

- preserve behavior
- use `.map`
- keep the expected variable bindings intact when possible
- avoid explanation or prose unless explicitly requested

Example output:

```js
const out = users.map((user) => user.name.toUpperCase());
```

## Correctness contract

An answer is correct if all are true:

1. it parses as JavaScript
2. it uses `.map`
3. it preserves behavior on generated tests
4. it does not introduce obvious side effects outside contract scope

## Confidence definition

`answer_confidence` means:

- estimated probability that the transformed program satisfies the
  `js_array_loop_to_map` contract and passes contract tests

## Control policy

Initial policy should be verifier-first:

- if route confidence is low: do not use the specialist
- if specialist output fails verification: fall back
- if specialist output passes verification: return it

Only after that should a learned confidence head be added.
