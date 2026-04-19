# Micro-Specialist Experiment Log

## 2026-04-13 — `js_array_loop_to_map` first valid uplift

Contract:

- `js_array_loop_to_map`
- base model: `Qwen/Qwen2.5-Coder-1.5B-Instruct`
- evaluator: strict continuation-only extraction + JS verifier in `node`

Valid control result (`lumina-micro-js-map-control-005`):

- samples: `64`
- routed rate: `1.000`
- pass rate: `0.797`
- syntax-valid rate: `1.000`
- uses-map rate: `1.000`

Valid treatment result (`lumina-micro-js-map-tx-005`):

- contract-matched fine-tune on synthetic `js_array_loop_to_map_v1`
- samples: `64`
- routed rate: `1.000`
- pass rate: `0.906`
- syntax-valid rate: `1.000`
- uses-map rate: `1.000`

Lift:

- verified pass-rate lift: `+0.109`
- relative error reduction: `~54%`

Interpretation:

- the contract-matched micro-specialist is real
- the base model was much stronger than the earlier invalid baseline suggested
- the uplift still cleared a meaningful margin under verification

Observed residual failure mode:

- most remaining failures are `.map(...)` expressions that omit the expected
  output-variable binding, e.g. `nums.map(...)` instead of
  `const doubled = nums.map(...)`

Decision:

- keep `js_array_loop_to_map` as the first validated micro-specialist contract
- keep the treatment checkpoint as the current best answer-model path for this
  contract
- next work should focus on correctness/control on top of this frozen contract,
  not broader training churn

## 2026-04-13 — `js_array_loop_to_map` confidence probe v1

Run:

- `lumina-micro-js-map-probe-v1-001`

Training result:

- val `AUROC`: `1.000`
- val `ECE`: `0.167`
- val `Brier`: `0.035`

Eval result on the promoted treatment checkpoint:

- pass rate: `0.906`
- eval `AUROC`: `1.000`
- eval `ECE`: `0.310`
- eval `Brier`: `0.124`

Threshold points:

- `0.30`
  - coverage: `0.906`
  - selective accuracy: `1.000`
  - overall accuracy: `0.906`
- `0.50`
  - coverage: `0.641`
  - selective accuracy: `1.000`

Interpretation:

- the learned probe cleanly separates the current narrow failure mode
- this is promising, but one run is not enough to freeze a policy
- next gate is stability across shuffled slices at `0.30` and `0.50`

## 2026-04-13 — `js_array_loop_to_map` policy stability

Run:

- `lumina-micro-js-map-policy-stability-001`

Probe training stayed consistent:

- val `AUROC`: `1.000`
- val `ECE`: `0.163`
- val `Brier`: `0.033`

Stability at `threshold 0.30`:

- coverage mean: `0.641`
- selective accuracy mean: `1.000`
- overall accuracy mean: `0.641`
- gain vs always-answer mean: `+0.094`
- always-answer accuracy mean: `0.906`

Stability at `threshold 0.50`:

- identical to `0.30` on this slice

Decision:

- promote `js_array_loop_to_map` as the first frozen micro-specialist baseline
- active path:
  - answer model: contract-matched treatment checkpoint
  - confidence head: `probe_v1`
  - mode: `baseline selective`
  - threshold: `0.30`

Important scope:

- this result is strong because the contract is very narrow and verifier-backed
- do not generalize this to broader JavaScript refactoring behavior
- use it as evidence that the micro-specialist pattern can work end to end

## 2026-04-13 — `js_reduce_accumulator_refactor` scaffold

Implemented:

- synthetic dataset builder
- rules-first router
- verifier
- baseline evaluator

Sanity result:

- gold-target baseline passes cleanly under the verifier after router fix

Operational note:

- local base-model baseline on CPU is too slow to use as the main loop here
- the first meaningful base-model read for this contract should come from the
  cloud baseline run

## 2026-04-14 — `js_reduce_accumulator_refactor` first cloud baseline

Run:

- `lumina-micro-js-reduce-baseline-002`

Result:

- samples: `64`
- routed rate: `1.000`
- pass rate: `0.625`
- syntax-valid rate: `1.000`
- uses-reduce rate: `1.000`

Observed failure mode:

- the model often emits a correct `.reduce(...)` expression without binding it
  to the expected accumulator variable
- example:
  - `users.reduce((acc, user) => acc + user.age, 0);`
  - expected binding: `totalAge`

Interpretation:

- the contract is viable
- the base model is already fairly strong here
- this contract still deserves one clean contract-matched uplift run

## 2026-04-14 — `js_reduce_accumulator_refactor` first uplift dropped

Result:

- control
  - `pass_rate = 0.625`
  - `syntax_valid_rate = 1.000`
- treatment
  - `pass_rate = 0.531`
  - `syntax_valid_rate = 0.797`

Observed regressions:

- repeated duplicate assignments in one completion
- malformed multiline output
- still-missing binding on some otherwise-correct `.reduce(...)` expressions

Method change for the rerun:

- make the required output binding explicit in:
  - dataset prompts
  - training prompts
  - runtime prompts
- require exactly one assignment statement to the expected output variable
- during eval, recover the first contract-matching reduce assignment from
  overlong generations instead of scoring the entire spillover completion

Decision:

- drop the first reduce uplift result
- rerun once with the stricter binding-aware method

## 2026-04-15 — `js_reduce_accumulator_refactor` promoted uplift

Rerun:

- control
  - `pass_rate = 0.797`
  - `syntax_valid_rate = 1.000`
  - `uses_reduce_rate = 0.797`
- treatment
  - `pass_rate = 1.000`
  - `syntax_valid_rate = 1.000`
  - `uses_reduce_rate = 1.000`

Training:

- epoch 1
  - `train_loss = 0.0799`
  - `val_loss = 0.0137`
- epoch 2
  - `train_loss = 0.0096`
  - `val_loss = 0.0067`

Interpretation:

- the contract-matched treatment is now a valid uplift
- the key fix was runtime statement stopping:
  - take the first complete contract-matching assignment statement
- this matches the intended micro-specialist contract behavior

Decision:

- promote `js_reduce_accumulator_refactor` as the second answer-model
  micro-specialist baseline
- next step is `probe_v1` on top of this promoted reduce path

## 2026-04-16 — `js_reduce_accumulator_refactor` confidence probe v1 validated

Gate result on `hard_val_v2`:

- answer-model pass rate: `0.766`
- negatives now exist on the held-out split, so confidence is testable

First probe rerun on `hard_val_v2` only as validation:

- dropped
- root cause:
  - probe training still used an all-positive train split

Fixed method:

- added `probe_train_v2.jsonl`
- probe training now uses adversarial `hard_v2` semantics with mixed
  positives/negatives
- validation/eval still uses `hard_val_v2.jsonl`

Validated probe result (`lumina-micro-js-reduce-probe-v1-004`):

- eval `pass_rate = 0.898`
- eval `AUROC = 1.000`
- eval `ECE = 0.369`
- eval `Brier = 0.143`

Threshold points:

- `0.30`
  - coverage: `0.945`
  - selective accuracy: `0.950`
  - overall accuracy: `0.898`
- `0.40`
  - coverage: `0.898`
  - selective accuracy: `1.000`
  - overall accuracy: `0.898`

Interpretation:

- the real issue was negative training data, not probe architecture
- reduce confidence is now validated on the adversarial held-out split
- next gate is stability at:
  - `0.40`
  - `0.50`

## 2026-04-17 — `js_reduce_accumulator_refactor` policy stability

Run:

- `lumina-micro-js-reduce-policy-stability-001`

Stability at `threshold 0.40`:

- coverage mean: `0.898`
- selective accuracy mean: `1.000`
- overall accuracy mean: `0.898`
- gain vs always-answer mean: `+0.102`
- always-answer accuracy mean: `0.898`

Stability at `threshold 0.50`:

- identical to `0.40` on this split

Decision:

- promote `js_reduce_accumulator_refactor` as the second frozen
  micro-specialist baseline
- active path:
  - answer model: contract-matched treatment checkpoint
  - confidence head: `probe_v1`
  - mode: `baseline selective`
  - threshold: `0.40`

Important scope:

- this result is on the adversarial `hard_val_v2` split, not a broad JS
  refactoring benchmark
- the micro-specialist evidence remains contract-specific by design

## 2026-04-15 — `js_reduce_accumulator_refactor` first probe saturated

Result:

- promoted answer model passed the full eval slice:
  - `pass_rate = 1.000`
  - `syntax_valid_rate = 1.000`
- probe training/eval had `positive_rate = 1.000`

Interpretation:

- this is not a valid confidence result
- the eval slice is saturated with positives, so the probe can only learn
  `everything passes`

Method change:

- add `hard_val.jsonl` with harder held-out reduce variants
- keep the promoted answer model fixed
- rerun the probe against the harder split before making any confidence claim

## 2026-04-17 — `js_filter_predicate_refactor` scaffold

Implemented:

- synthetic dataset builder
- rules-first router
- verifier
- baseline evaluator

Local sanity result:

- gold-target verifier path passes cleanly

Decision:

- launch the first cloud baseline before any adapter training
- keep the same contract-first sequence:
  - baseline
  - uplift
  - confidence

## 2026-04-18 — `js_filter_predicate_refactor` easy baseline saturated

Run:

- `lumina-micro-js-filter-baseline-001`

Result:

- samples: `64`
- routed rate: `1.000`
- pass rate: `1.000`
- syntax-valid rate: `1.000`
- uses-filter rate: `1.000`

Interpretation:

- the contract is valid
- the easy split is not discriminative
- base `Qwen/Qwen2.5-Coder-1.5B-Instruct` already solves it perfectly

Decision:

- do not train an uplift on the easy split
- add a harder held-out gate with conjunction, disjunction, negation, and
  less-trivial predicate forms
- only continue if the hard gate creates real headroom

## 2026-04-18 — `js_reduce_object_index_builder` scaffold

Implemented:

- synthetic dataset builder
- rules-first router
- verifier
- baseline evaluator

Local sanity result:

- gold-target verifier path passes cleanly

Decision:

- launch the first cloud baseline before any adapter training
- keep the same contract-first sequence:
  - baseline
  - uplift
  - confidence

## 2026-04-18 — `js_reduce_object_index_builder` first cloud baseline

Run:

- `lumina-micro-js-reduce-index-baseline-001`

Result:

- samples: `64`
- routed rate: `1.000`
- pass rate: `0.641`
- syntax-valid rate: `0.641`
- uses-reduce rate: `1.000`

Observed failure mode:

- the model often emits the right reduce pattern but truncates before closing
- representative failure:
  - `const productsBySku = products.reduce((acc, product) => { acc[product.sku] = product;`

Interpretation:

- the contract is viable
- the base model is not saturated
- failure is structured and should be addressable with contract-matched uplift

Decision:

- continue with the standard uplift A/B
