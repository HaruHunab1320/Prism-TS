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
