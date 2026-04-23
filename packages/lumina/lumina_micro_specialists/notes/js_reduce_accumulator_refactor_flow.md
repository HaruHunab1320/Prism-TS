# End-to-End Flow: `js_reduce_accumulator_refactor`

## Goal

Handle a normal user prompt that asks for an accumulator refactor and produce a
verified `.reduce(...)` solution.

## Example user prompt

```text
Refactor this loop to use reduce:

let total = 0;
for (let i = 0; i < nums.length; i++) {
  total += nums[i];
}
```

## Runtime flow

### 1. Intake

Receive:

- free-form prompt
- optional code block

Extract:

- language guess
- requested action
- code snippet

### 2. High-precision contract routing

Route to `js_reduce_accumulator_refactor` only if:

- language looks like JavaScript
- one accumulator is initialized before the loop
- the loop performs a simple repeated accumulator update
- prompt indicates refactor / rewrite / use `reduce`
- no obvious side effects or multi-accumulator behavior exists

Outputs:

- `route = specialist`
- `route = fallback`

### 3. Specialist execution

Prompt the specialist with a strict contract prompt:

- output only JavaScript
- preserve behavior
- use `.reduce`
- keep the accumulator binding
- no prose

### 4. Verifier

Run contract checks:

- parse result
- confirm `.reduce` is present
- derive tests from the original accumulator pattern
- compare original and transformed outputs

Outputs:

- `verify = pass`
- `verify = fail`

### 5. Control decision

Initial decision policy:

- if `route = fallback`, use the broader code model
- if `verify = fail`, use fallback
- if `verify = pass`, return specialist output

Later:

- add learned `answer_confidence`
- selective answering once the residual failure shape is known

### 6. Final response

Return:

- transformed JavaScript
- optional explanation only if the user asked

Internal metadata:

- `task_contract = js_reduce_accumulator_refactor`
- `selected_path = specialist | fallback`
- `verification_status = pass | fail`
- `answer_confidence` when implemented
