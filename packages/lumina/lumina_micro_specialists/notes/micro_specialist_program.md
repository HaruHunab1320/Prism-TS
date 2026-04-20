# Micro-Specialist Program

## Thesis

Lumina is more likely to work with narrow, verifier-backed specialists than
with broad domain buckets.

Bad unit of specialization:

- `code`
- `math`
- `general`

Better unit of specialization:

- one tightly scoped task contract with a known verifier

Examples:

- `js_array_loop_to_map`
- `js_reduce_accumulator_refactor`
- `js_reduce_object_index_builder`
- `js_filter_predicate_refactor`
- `python_pandas_groupby_aggregate`
- `sql_select_where_to_join_fix`

## Selection criteria for a micro-specialist

A candidate contract is worth building only if it has all of:

1. narrow and easy to detect
2. executable or otherwise strongly verifiable
3. enough data can be generated or curated cheaply
4. common enough that solving it is useful
5. different enough from nearby contracts that routing is defensible

## First build rule

Do not train from scratch.

Use:

- one strong base code model
- one adapter / LoRA per contract
- one verifier per contract
- one high-precision router

## First product rule

The user should not need to know the contract name.

The runtime should:

1. detect whether the request fits the contract
2. run the specialist only if the fit is strong
3. verify the output
4. fall back cleanly if the specialist fails

## Promotion rule

A micro-specialist is only worth keeping if it improves:

- verified task success
- or selective-answer quality under a learned correctness estimate

without making the end-to-end path brittle

For narrow verifier-backed contracts, judge promotion by one of:

- `>= +0.10` absolute verified pass-rate lift, or
- `>= 25%` relative error reduction

on the exact same contract and verifier

## Current validated contracts

1. `js_array_loop_to_map`
- answer model uplift: `0.797 -> 0.906`
- frozen control path:
  - `probe_v1`
  - `baseline selective`
  - `threshold 0.30`

2. `js_reduce_accumulator_refactor`
- answer model uplift: `0.797 -> 1.000` under the contract-matched runtime
- frozen control path:
  - `probe_v1`
  - `baseline selective`
  - `threshold 0.40`

3. `js_reduce_object_index_builder`
- answer model uplift: `0.641 -> 1.000`
- frozen control path:
  - `probe_v1`
  - `baseline selective`
  - `threshold 0.50`

Current evidence supports:

- narrow verifier-backed micro-specialists can materially improve task success
- contract-specific learned confidence can support stable selective control

Current evidence does not support:

- broad specialization buckets
- universal confidence across unrelated tasks
