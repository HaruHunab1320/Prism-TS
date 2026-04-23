# Lumina Micro Standalone Repo Dry Run

This directory is a runnable dry run of what a standalone shareable `lumina-micro` repo would look like.

It is the distilled surface only:

- 3 frozen JavaScript micro-specialists
- local runtime
- paper and audit docs
- demo artifacts

## What it proves

This dry run supports a narrow claim:

> A verifier-backed local code transformation runtime where narrow contract specialists improve pass rates and confidence-gated acceptance enables high-precision rewrites.

## What is included

- `lumina_micro/`
  - local runtime package
  - contract routers
  - verifiers
  - demo entrypoints
- `paper/`
  - research note
  - methods appendix
  - results table
  - case gallery
- `examples/`
  - sample input
- `artifacts/`
  - captured demo and benchmark outputs
- `tools/`
  - shell entrypoints

## Fastest commands

From this directory:

Mock demo:

```bash
bash tools/run_demo_present.sh
```

Ollama demo:

```bash
LUMINA_MICRO_BACKEND=ollama \
LUMINA_MICRO_OLLAMA_MODEL=llama3.1:latest \
LUMINA_MICRO_OLLAMA_KEEPALIVE=5m \
bash tools/run_demo_present.sh
```

Benchmark:

```bash
LUMINA_MICRO_BACKEND=ollama \
LUMINA_MICRO_OLLAMA_MODEL=llama3.1:latest \
LUMINA_MICRO_OLLAMA_KEEPALIVE=5m \
LUMINA_MICRO_ITERATIONS=3 \
LUMINA_MICRO_COLD_FIRST=1 \
bash tools/run_bench_demo.sh
```

## Important limitation

This is a real runnable dry run, but it still preserves one architectural limitation from the current project:

- the local backend uses a single Ollama model
- it is shaped like a shared-base system
- it is not yet true adapter-swapping deployment

## Best audit path

1. `paper/research_note.md`
2. `paper/results_table.md`
3. `paper/appendix_methods.md`
4. `paper/case_gallery.md`
