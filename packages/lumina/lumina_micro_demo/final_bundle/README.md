# Lumina Micro Demo Bundle

This is the packaged bundle for the current local micro-specialist demo.

It is meant to be the shortest path to understanding what exists now, what is validated, and how to run it.

## What this bundle contains

- a runnable local demo path
- a runnable local benchmark path
- the frozen sample input used for the presentation demo
- the validated research evidence for the three promoted micro-specialists
- a concise explanation of what the demo proves and what it does not prove

## What the demo does

Given a normal JavaScript refactor prompt, the runtime:

1. finds transformable loop spans
2. routes each span to one of three frozen micro-specialists
3. generates a rewrite
4. verifies the rewrite
5. applies confidence-threshold gating
6. accepts or falls back per step
7. composes the final output

The three promoted contracts are:

- `js_array_loop_to_map`
- `js_reduce_accumulator_refactor`
- `js_reduce_object_index_builder`

## What is validated

- narrow verifier-backed specialists can outperform the base model on exact contracts
- contract-specific confidence can support stable selective control
- the full prompt -> route -> verify -> accept/fallback -> compose loop runs locally on Mac with Ollama

## What is not validated

- universal confidence
- broad code competence
- true adapter swapping in the local runtime

The current local backend is shaped like a shared-base system, but it still runs through a single local Ollama model.

## Fastest way to inspect

Read in this order:

1. `docs/what_this_bundle_is.md`
2. `docs/research_note.md`
3. `docs/validated_micro_specialist_evidence.md`
4. `artifacts/demo_input.js`
5. `artifacts/mock_demo_output.txt`
6. `artifacts/ollama_demo_output.txt`
7. `artifacts/ollama_benchmark.json`

## Run commands

Mock demo:

```bash
bash lumina_micro_demo/final_bundle/tools/run_mock_demo.sh
```

Ollama demo:

```bash
bash lumina_micro_demo/final_bundle/tools/run_ollama_demo.sh
```

Benchmark:

```bash
bash lumina_micro_demo/final_bundle/tools/run_ollama_benchmark.sh
```

## Source of truth

The runtime source that powers this bundle lives in:

- `lumina_micro_demo/runtime/`
- `lumina_micro_demo/run_demo_present.py`
- `lumina_micro_demo/bench_demo.py`

This bundle is a packaged entrypoint, not a forked implementation.
