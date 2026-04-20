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

## Work order

1. define shared-base adapter packaging
2. define runtime trace schema
3. build a rules-first span router
4. build one local orchestrator
5. measure memory and latency on one-machine runs
