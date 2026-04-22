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
8. presentation-oriented CLI demo view
9. contract-preserving local Ollama normalization for the 3 promoted specialists

Validated locally:
- `mock` backend completes on the sample input
- `ollama` backend completes on the sample input with `llama3.1:latest`

Still missing:
1. real shared-base adapter backend
2. persistent confidence heads instead of heuristic scoring inside the local runtime
3. a repeatable public-demo script around the local benchmark path

## Measured local sample

On the sample 3-step JavaScript refactor input after the normalization pass:

- `mock` backend total latency: about `590 ms`
- `ollama` presentation demo completes with `3/3` accepted steps
- `ollama` demo total latency: about `3.1 s` with `llama3.1:latest`
- first specialist call still dominates cold/warm startup cost
- `ollama ps` reports the loaded model at about `5.9 GB` and `100% GPU` on the local machine

## Measured local benchmark

Ollama benchmark on the sample 3-step input with `llama3.1:latest`, `keepalive=5m`, `3` iterations, cold stop before the first run:

- total latency mean: about `2.77 s`
- cold total latency: about `3.99 s`
- warm totals: about `2.14-2.19 s`
- warm per-step latency settled around:
  - step 1: `0.57-0.58 s`
  - step 2: `0.73-0.81 s`
  - step 3: `0.82-0.83 s`
- `ollama ps` still reports the model loaded at about `5.9 GB` on GPU after the run
