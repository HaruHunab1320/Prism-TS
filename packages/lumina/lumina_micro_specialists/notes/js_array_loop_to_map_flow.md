# End-to-End Flow: `js_array_loop_to_map`

## Goal

Handle a normal user prompt and produce a meaningful answer through a narrow
micro-specialist path.

## Example user prompt

```text
Refactor this loop to use map:

const out = [];
for (let i = 0; i < users.length; i++) {
  out.push(users[i].name.toUpperCase());
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

Rules-first routing for v1.

Route to `js_array_loop_to_map` only if:

- language looks like JavaScript
- loop writes to an output array with `push`
- prompt indicates refactor / rewrite / use `map`
- no obvious filter/reduce/side-effect shape is detected

Outputs:

- `route = specialist`
- `route = fallback`

### 3. Specialist execution

Prompt the specialist with a strict contract prompt:

- output only JavaScript
- preserve behavior
- use `.map`
- no prose

### 4. Verifier

Run contract checks:

- parse result
- confirm `.map` is present
- derive tests from the original loop pattern
- compare original and transformed outputs on generated cases

Outputs:

- `verify = pass`
- `verify = fail`

### 5. Control decision

Initial v1 decision policy:

- if `route = fallback`, use base code model or return a constrained explanation
- if `verify = fail`, use fallback
- if `verify = pass`, return specialist output

Later policy:

- add learned `answer_confidence`
- selective acceptance when verification is partial or probabilistic

### 6. Final response

Return:

- transformed JavaScript
- optional short explanation only if the user asked

Internal metadata:

- `task_contract = js_array_loop_to_map`
- `selected_path = specialist | fallback`
- `verification_status = pass | fail`
- `answer_confidence` when implemented

## Why this flow is meaningful

It gives the user something trustworthy:

- narrow scope
- high-precision routing
- verifier-backed answer
- explicit fallback when out of scope

That is a real system, not just a tiny model demo.
