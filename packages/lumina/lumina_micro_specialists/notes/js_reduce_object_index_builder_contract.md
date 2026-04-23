# `js_reduce_object_index_builder` Contract

## Task

Convert a narrow JavaScript loop that builds an object index from array elements into one `.reduce(...)` assignment.

## Input shape

- output object initialized to `{}`
- one `for` / `for..of` loop over a single array
- one indexed assignment into the output object
- assigned value is the current element

## Output shape

Return exactly one JavaScript statement:

- binds to the expected output variable
- uses `<array>.reduce(...)`
- returns the accumulator object
- preserves behavior
- no explanation

## Correctness

A candidate is correct only if:

- parses as JavaScript
- uses `.reduce(...)`
- assigns to the expected output variable
- passes verifier tests on held-out inputs
