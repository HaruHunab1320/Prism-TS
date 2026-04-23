# Appendix: Methods and Audit Details

## Scope

This appendix records the concrete experimental surface behind the three promoted JavaScript micro-specialists:

- `js_array_loop_to_map`
- `js_reduce_accumulator_refactor`
- `js_reduce_object_index_builder`

The intent is reproducibility and auditability, not narrative.

## Contract definition

Each contract includes five parts:

1. a routing rule
2. a strict prompt shape
3. an output extraction rule
4. an executable verifier
5. a frozen threshold policy

The system only counts a step as accepted when:

- the routed specialist matches the contract
- the generated code passes the verifier
- the confidence score clears the frozen threshold

## Base model family

Research answer-model paths were trained on top of:

- `Qwen/Qwen2.5-Coder-1.5B-Instruct`

The packaged local runtime uses:

- Ollama backend with `llama3.1:latest`

This is an important distinction. The local demo validates runtime shape, not the exact research deployment architecture.

## Dataset generation

### `js_array_loop_to_map`

Builder:

- `lumina_micro_specialists/data/build_js_array_loop_to_map_dataset.py`

Default split sizes:

- train: `320`
- val: `64`

Observed train/val pattern family:

- `for_of_object_literal`
- `indexed_numeric_double`
- `indexed_property_upper`
- `indexed_trim`

### `js_reduce_accumulator_refactor`

Builder:

- `lumina_micro_specialists/data/build_js_reduce_accumulator_refactor_dataset.py`

Default split sizes:

- train: `320`
- val: `64`
- hard_val: `128`
- probe_train_v2: `256`
- hard_val_v2: `128`

Base train/val pattern family:

- `for_of_numeric_product`
- `for_of_property_sum`
- `indexed_numeric_sum`
- `indexed_string_concat`

Adversarial `hard_val_v2` / `probe_train_v2` pattern family:

- `for_of_boolean_and`
- `for_of_boolean_or`
- `for_of_collect_initials`
- `for_of_count_predicate`
- `for_of_min_value`
- `for_of_weighted_sum`
- `indexed_max_value`
- `indexed_sum_string_lengths`

### `js_reduce_object_index_builder`

Builder:

- `lumina_micro_specialists/data/build_js_reduce_object_index_builder_dataset.py`

Default split sizes:

- train: `320`
- val: `64`
- hard_val: `128`
- probe_train_v2: `256`
- hard_val_v2: `128`

Base train/val pattern family:

- `for_of_pages_by_slug`
- `for_of_users_by_id`
- `indexed_members_by_handle`
- `indexed_products_by_sku`

Adversarial `hard_val_v2` / `probe_train_v2` pattern family:

- `for_of_articles_by_author_slug`
- `for_of_customers_by_normalized_email`
- `indexed_products_by_category_sku`
- `indexed_sessions_by_user_token`

## Train / eval separation

The intended separation is:

- answer-model uplift:
  - train on `train.jsonl`
  - evaluate on `val.jsonl`
- confidence, when needed:
  - train on `probe_train_v2.jsonl`
  - validate and evaluate on `hard_val_v2.jsonl`

This mattered especially for `reduce` and `object_index`, where early confidence runs failed because the evaluation slice contained no negatives.

## Verifier definitions

Verifier implementations:

- `lumina_micro_specialists/evaluation/verify_js_array_loop_to_map.py`
- `lumina_micro_specialists/evaluation/verify_js_reduce_accumulator_refactor.py`
- `lumina_micro_specialists/evaluation/verify_js_reduce_object_index_builder.py`

All three verifiers use the same structure:

1. parse candidate JavaScript with `node --check`
2. require contract marker presence:
   - `.map(` for the map contract
   - `.reduce(` for both reduce contracts
3. run executable test cases in Node
4. compare `actual` and `expected_output` by JSON equality

A candidate is counted as passing only if:

- syntax is valid
- the contract marker is present
- all generated tests pass

## Threshold selection

Thresholds were not chosen as universal defaults. They were frozen per contract after threshold sweeps and stability runs.

Frozen thresholds:

- `js_array_loop_to_map`: `0.30`
- `js_reduce_accumulator_refactor`: `0.40`
- `js_reduce_object_index_builder`: `0.50`

Interpretation rule:

- these are high-precision selective-accept thresholds
- they should always be read together with coverage
- a `1.000` selective accuracy result with low coverage means the system is conservative, not universally correct

## Evaluation basis behind the frozen claims

### Answer uplift

- `js_array_loop_to_map`: `64` sample validation slice
- `js_reduce_accumulator_refactor`: `64` sample validation slice
- `js_reduce_object_index_builder`: `64` sample validation slice

### Confidence / selective control

- `js_array_loop_to_map`: narrow contract slice used in stability run
- `js_reduce_accumulator_refactor`: adversarial `hard_val_v2`, `128` samples
- `js_reduce_object_index_builder`: adversarial `hard_val_v2`, `128` samples

## Acceptance semantics in the packaged runtime

Runtime implementation:

- `lumina_micro_demo/runtime/orchestrator.py`

A step is accepted only if:

- verifier passes
- confidence >= frozen threshold

Otherwise the system falls back by keeping the original block unchanged.

## Known boundary between research and demo

Research result:

- contract-specific answer uplift
- contract-specific learned confidence
- frozen threshold policies

Packaged local demo:

- uses a single local Ollama backend
- uses runtime heuristics shaped by the frozen contracts
- does not yet load the persisted research heads directly
- does not yet perform true adapter swapping
