# `js_filter_predicate_refactor` Contract

## Task

Convert a narrow JavaScript loop that conditionally pushes original elements into a preinitialized array into one `.filter(...)` assignment.

## Input shape

- output array initialized to `[]`
- one `for` / `for..of` loop over a single array
- one `if (...)` guard inside the loop
- guarded `push(...)` into the output array
- pushed value is the original element from the source array

## Output shape

Return exactly one JavaScript statement:

- binds to the expected output variable
- uses `<array>.filter(...)`
- preserves behavior
- no explanation

## Correctness

A candidate is correct only if:

- parses as JavaScript
- uses `.filter(...)`
- assigns to the expected output variable
- passes verifier tests on held-out inputs
