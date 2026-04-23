# Validated Micro-Specialist Evidence — 2026-04-20

This note freezes what the micro-specialist program has validated so far.

## Frozen baselines

### `js_array_loop_to_map`

- answer uplift:
  - control pass rate: `0.797`
  - treatment pass rate: `0.906`
- frozen control path:
  - confidence head: `probe_v1`
  - mode: `baseline selective`
  - threshold: `0.30`
- stable policy result:
  - coverage mean: `0.641`
  - selective accuracy mean: `1.000`
  - overall accuracy mean: `0.641`

### `js_reduce_accumulator_refactor`

- answer uplift:
  - control pass rate: `0.797`
  - treatment pass rate: `1.000`
- adversarial basis:
  - probe train: `probe_train_v2`
  - eval: `hard_val_v2`
- frozen control path:
  - confidence head: `probe_v1`
  - mode: `baseline selective`
  - threshold: `0.40`
- stable policy result:
  - coverage mean: `0.898`
  - selective accuracy mean: `1.000`
  - overall accuracy mean: `0.898`

### `js_reduce_object_index_builder`

- answer uplift:
  - control pass rate: `0.641`
  - treatment pass rate: `1.000`
- adversarial basis:
  - probe train: `probe_train_v2`
  - eval: `hard_val_v2`
- frozen control path:
  - confidence head: `probe_v1`
  - mode: `baseline selective`
  - threshold: `0.50`
- stable policy result:
  - coverage mean: `0.414`
  - selective accuracy mean: `1.000`
  - overall accuracy mean: `0.414`

## What this validates

- narrow verifier-backed specialists can materially outperform the base model on precise contracts
- contract-matched training targets and contract-matched runtime extraction are critical
- learned confidence can support stable selective control when it is trained on mixed positive/negative contract data

## What this does not validate

- universal confidence across tasks
- broad code competence
- broad multimodel routing/arbitration

The evidence is intentionally contract-specific.
