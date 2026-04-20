# Demo Flow

## User input

A normal JavaScript refactor request containing multiple loop patterns.

## Example

Input includes:
- one loop convertible to `.map`
- one loop convertible to accumulator `.reduce`
- one loop convertible to object-index `.reduce`

## Runtime behavior

1. parse candidate spans
2. assign each span to a frozen contract
3. run the chosen specialist
4. verify output
5. keep only verified/high-confidence results
6. merge accepted rewrites into final code

## Demo output

- final transformed code
- per-step execution trace with:
  - contract
  - selected path
  - verifier result
  - answer confidence
  - threshold
  - action
