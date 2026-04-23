# Micro-Specialist Program

## Thesis

Lumina works better with narrow, verifier-backed specialists than with broad
buckets like `code`, `math`, or `general`.

The right unit of specialization is:

- one tightly scoped task contract
- one verifier
- one high-precision router
- one contract-specific confidence head

## Promotion rule

Keep a micro-specialist only if it improves:

- verified task success
- or selective-answer quality under a learned correctness estimate

For narrow verifier-backed contracts, promote on one of:

- `>= +0.10` absolute verified pass-rate lift, or
- `>= 25%` relative error reduction

## Frozen contracts

### `js_array_loop_to_map`
- answer model uplift: `0.797 -> 0.906`
- frozen control path:
  - `probe_v1`
  - `baseline selective`
  - `threshold 0.30`

### `js_reduce_accumulator_refactor`
- answer model uplift: `0.797 -> 1.000`
- frozen control path:
  - `probe_v1`
  - `baseline selective`
  - `threshold 0.40`

### `js_reduce_object_index_builder`
- answer model uplift: `0.641 -> 1.000`
- frozen control path:
  - `probe_v1`
  - `baseline selective`
  - `threshold 0.50`

## Archived candidate

### `js_filter_predicate_refactor`
- base model saturated the contract and harder gate at `1.000`
- no specialist headroom
- archived instead of forced

## What the evidence supports

- narrow verifier-backed micro-specialists can materially improve task success
- contract-specific learned confidence can support stable selective control
- adversarial eval splits are required for credible confidence results

## What it does not support

- broad specialization buckets
- universal confidence across unrelated tasks
- a separate full checkpoint per micro-task as the final deployment shape

## Current direction

Stop expanding the research tree with more full checkpoints.
Move to a shared-base runtime with:

- one local base model
- one adapter per promoted contract
- one tiny confidence head per contract
- one orchestration layer for routing, verification, and fallback
