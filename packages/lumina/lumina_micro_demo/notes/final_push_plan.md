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
4. real local `ollama` backend
5. verifier-backed accept/fallback behavior
6. final composed output
7. readable CLI demo view

Validated locally:
- `mock` backend completes on the sample input
- `ollama` backend completes on the sample input with `llama3.1:latest`

Still missing:
1. real shared-base adapter backend
2. confidence-threshold-driven fallback behavior beyond binary verifier pass/fail
3. local memory/latency measurements on the target Mac runtime

## Measured local sample

On the sample 3-step JavaScript refactor input:

- `mock` backend total latency: about `590 ms`
- `ollama` backend total latency: about `6.0-7.0 s` with `llama3.1:latest`
- first specialist call dominates cold/warm startup cost
- `ollama ps` reports the loaded model at about `5.9 GB` and `100% GPU` on the local machine
