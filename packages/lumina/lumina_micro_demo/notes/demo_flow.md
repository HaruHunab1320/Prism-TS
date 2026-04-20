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
3. synthesize a contract-matched rewrite for the routed step
4. generate verifier inputs from the original imperative block
5. verify the rewrite against the contract
6. accept verified outputs, fall back otherwise
7. merge accepted rewrites into final code

## Demo output

- final transformed code
- per-step execution trace with:
  - contract
  - selected path
  - verifier result
  - answer confidence
  - threshold
  - action
