# Validated Micro-Specialist Evidence — 2026-04-17

This note freezes what the micro-specialist program has actually validated.

## Validated contracts

### `js_array_loop_to_map`

Answer-model uplift:

- control pass rate: `0.797`
- treatment pass rate: `0.906`
- absolute lift: `+0.109`

Frozen control path:

- confidence head: `probe_v1`
- mode: `baseline selective`
- threshold: `0.30`

Stable policy result:

- coverage mean: `0.641`
- selective accuracy mean: `1.000`
- overall accuracy mean: `0.641`
- gain vs always-answer mean: `+0.094`

### `js_reduce_accumulator_refactor`

Answer-model uplift:

- control pass rate: `0.797`
- treatment pass rate: `1.000`
- absolute lift: `+0.203`

Frozen control path:

- confidence head: `probe_v1`
- mode: `baseline selective`
- threshold: `0.40`

Adversarial eval basis:

- probe trained on `probe_train_v2`
- validated on `hard_val_v2`

Stable policy result:

- coverage mean: `0.898`
- selective accuracy mean: `1.000`
- overall accuracy mean: `0.898`
- gain vs always-answer mean: `+0.102`

## What this validates

- narrow, verifier-backed specialists are a better unit of specialization than
  broad buckets like `code` or `math`
- contract-matched training and contract-matched runtime matter materially
- learned confidence is useful when it is tied to a narrow contract with real
  negative examples

## What this does not validate

- universal confidence across tasks
- broad multimodel arbitration
- broad code or language competence

The evidence is contract-specific by design. That is a strength, not a defect.
