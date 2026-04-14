# Lumina Micro-Specialists

This workspace is for narrow, contract-matched specialists.

The goal is not "code" or "math" in general. The goal is one small task that:

- has a precise input/output contract
- is cheap to verify
- can be routed with high precision
- can fall back cleanly when outside scope

## First vertical slice

- contract: `js_array_loop_to_map`
- domain: JavaScript refactoring
- task: convert a simple imperative array transform loop into `.map`

See:

- `notes/js_array_loop_to_map_contract.md`
- `notes/js_array_loop_to_map_flow.md`
- `notes/js_array_loop_to_map_build_plan.md`
- `notes/js_reduce_accumulator_refactor_contract.md`
- `notes/js_reduce_accumulator_refactor_flow.md`
- `notes/js_reduce_accumulator_refactor_build_plan.md`
- `notes/micro_specialist_program.md`
- `notes/experiment_log.md`

## Why this path

Broad specialists like `code`, `math`, and `general` were still too wide.

Micro-specialists are intended to be:

- easier to train well
- easier to evaluate rigorously
- easier to route safely
- easier to attach confidence/control behavior to

## Planned structure

- `notes/`
  - contract specs
  - routing rules
  - verifier design
  - end-to-end flow notes
- `data/`
  - narrow contract-matched datasets
- `evaluation/`
  - verifier and contract-specific evaluation
- `training/`
  - adapter or LoRA training for the narrow contract
- `runtime/`
  - router + specialist + verifier + fallback path

## First runnable commands

Build the synthetic contract dataset:

```bash
bash lumina_micro_specialists/tools/build_js_array_loop_to_map_dataset.sh
```

Build the next reduce contract dataset:

```bash
bash lumina_micro_specialists/tools/build_js_reduce_accumulator_refactor_dataset.sh
```

Run the verifier sanity baseline against the gold target:

```bash
LUMINA_MICRO_SOURCE=target \
bash lumina_micro_specialists/tools/run_js_array_loop_to_map_baseline.sh
```

Run a real base-model baseline:

```bash
LUMINA_MICRO_SOURCE=model \
LUMINA_MICRO_MODEL="Qwen/Qwen2.5-Coder-1.5B-Instruct" \
bash lumina_micro_specialists/tools/run_js_array_loop_to_map_baseline.sh
```

Run a real base-model baseline for the reduce contract:

```bash
LUMINA_MICRO_SOURCE=model \
LUMINA_MICRO_MODEL="/tmp/Qwen_Qwen2.5-Coder-1.5B-Instruct_flat" \
bash lumina_micro_specialists/tools/run_js_reduce_accumulator_refactor_baseline.sh
```

Train the first contract-matched uplift:

```bash
bash lumina_micro_specialists/tools/run_train_js_array_loop_to_map_adapter.sh
```

Compare base model vs trained treatment:

```bash
bash lumina_micro_specialists/tools/run_js_array_loop_to_map_uplift.sh
```

Train the first contract-specific confidence probe:

```bash
bash lumina_micro_specialists/tools/run_train_js_array_loop_to_map_confidence_head.sh
```

## Current result

First valid cloud A/B (`2026-04-13`):

- control verified pass rate: `0.797`
- treatment verified pass rate: `0.906`
- lift: `+0.109`
- relative error reduction: `~54%`

This is enough to keep the contract and freeze the treatment checkpoint as the
current best path for `js_array_loop_to_map`.

Promoted micro-specialist baseline:

- contract: `js_array_loop_to_map`
- answer model: contract-matched treatment checkpoint
- confidence head: `probe_v1`
- mode: `baseline selective`
- threshold: `0.30`

Policy stability:

- coverage mean: `0.641`
- selective accuracy mean: `1.000`
- overall accuracy mean: `0.641`
- gain vs always-answer mean: `+0.094`

## Next contract

Next vertical slice:

- `js_reduce_accumulator_refactor`

Goal:

- convert a simple accumulator loop into a correct `.reduce(...)` expression
- keep the same pattern:
  - rules-first routing
  - verifier-backed answer model
  - learned correctness estimate
  - fixed policy stability before promotion

Current base-model read for `js_reduce_accumulator_refactor`:

- pass rate: `0.625`
- syntax-valid rate: `1.000`
- uses-reduce rate: `1.000`

Main failure mode:

- missing expected accumulator binding on otherwise correct `.reduce(...)`
  expressions

## Working rule

Each micro-specialist must prove one thing:

- under its contract, it beats the base model strongly enough to justify the
  extra routing and control complexity
