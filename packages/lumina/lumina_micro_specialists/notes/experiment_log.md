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
