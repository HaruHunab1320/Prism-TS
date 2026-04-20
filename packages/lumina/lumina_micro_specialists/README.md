# Lumina Micro-Specialists

This workspace holds the validated micro-specialist research path.

The main result is narrow, verifier-backed specialists with contract-specific
confidence, not broad domain specialists.

## Frozen baselines

### 1. `js_array_loop_to_map`
- answer model: promoted treatment checkpoint
- confidence head: `probe_v1`
- mode: `baseline selective`
- threshold: `0.30`
- stable result:
  - coverage mean: `0.641`
  - selective accuracy mean: `1.000`
  - overall accuracy mean: `0.641`

### 2. `js_reduce_accumulator_refactor`
- answer model: promoted treatment checkpoint
- confidence head: `probe_v1`
- mode: `baseline selective`
- threshold: `0.40`
- stable result:
  - coverage mean: `0.898`
  - selective accuracy mean: `1.000`
  - overall accuracy mean: `0.898`

### 3. `js_reduce_object_index_builder`
- answer model: promoted treatment checkpoint
- confidence head: `probe_v1`
- mode: `baseline selective`
- threshold: `0.50`
- stable result on adversarial `hard_val_v2`:
  - coverage mean: `0.414`
  - selective accuracy mean: `1.000`
  - overall accuracy mean: `0.414`

## Active notes

- `notes/micro_specialist_program.md`
- `notes/experiment_log.md`
- `notes/validated_evidence_2026-04-20.md`
- `notes/js_array_loop_to_map_contract.md`
- `notes/js_reduce_accumulator_refactor_contract.md`
- `notes/js_reduce_object_index_builder_contract.md`

## Archive

Dropped or superseded contracts and evidence were moved to:

- `archive/2026-04/notes/`

That currently includes:
- `js_filter_predicate_refactor`
- older evidence snapshots

## What this workspace proves

- narrow verifier-backed specialists can materially beat the base model
- contract-specific learned confidence can support stable selective control
- the contract and runtime shape matter as much as the training recipe

It does not prove:
- broad specialization buckets
- universal confidence across unrelated tasks
- deployment efficiency yet

## Next phase

The next phase is not more full checkpoint churn.
The next phase is a shared-base local runtime:

- one base model
- specialist adapters/deltas
- tiny confidence heads
- verifier-backed routing

That work is being staged in `lumina_micro_demo/`.
