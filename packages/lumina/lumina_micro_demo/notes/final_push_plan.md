# Final Push Plan

## Goal

Turn the validated research result into a compact local demo.

## Frozen inputs

- `js_array_loop_to_map`
- `js_reduce_accumulator_refactor`
- `js_reduce_object_index_builder`

Each already has:
- promoted answer path
- promoted confidence head
- frozen threshold

## Delivery target

A local Mac-first runtime that:
1. receives a normal JavaScript refactor prompt
2. splits it into transformable spans
3. routes each span to the correct micro-specialist
4. runs verifier-backed acceptance
5. returns transformed code plus an execution trace

## Current scaffold state

Implemented now:
1. route/planning trace
2. specialist backend interface
3. mock contract-matched execution backend
4. verifier-backed accept/fallback behavior
5. final composed output
6. readable CLI demo view

Still missing:
1. real shared-base adapter backend
2. confidence-threshold-driven fallback behavior beyond binary verifier pass/fail
3. local memory/latency measurements on the target Mac runtime
