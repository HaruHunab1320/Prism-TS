# Lumina Basic Plan (Single-Model Confidence-Head)

## Status

Prototype exists, but the research plan has been reset.

Active direction:

- validate confidence as a useful control signal in a single-model setting
- postpone multimodel branching claims until that is proven

See:

- `lumina_basic/notes/reset_plan_2026-03-27.md`
- `lumina_basic/notes/math_confidence_contract.md`

## Goal

Test the original Lumina question in the smallest defensible form:

- can a model produce a signal that predicts answer correctness well enough to
  improve abstain or escalate decisions?

## Completed prototype work

1) Implemented a small confidence-head wrapper. ✅
2) Implemented a branching policy prototype. ✅
3) Added smoke/disagreement checks. ✅

These are useful scaffolding, not proof.

## Active phases

### Phase A — Single-model confidence baseline

1) Freeze one domain and one canonical eval contract.
2) Train/evaluate answer-confidence or correctness signal.
3) Measure:
   - accuracy / EM / F1
   - ECE / Brier
   - AUROC vs correctness
   - risk-coverage

Current status:

- initial positive result achieved on the math contract
- learned confidence improves selective answering over always-answer
- current best observed useful threshold region is roughly `0.10–0.30`

### Phase B — Control-action validation

1) Compare:
   - always answer
   - abstain below threshold
   - escalate below threshold
2) Require confidence to improve a real decision, not just metadata quality.

Current status:

- selective-answer / abstain behavior is the active positive result
- structured verification-style escalation was tested and dropped
- larger probe training improved confidence quality materially
- next step is threshold re-selection on the stronger probe

Current operating-point recommendation:

- default scaled-probe selective-answer policy:
  - threshold `0.15`
  - coverage `0.354`
  - selective accuracy `0.243`
  - gain vs always-answer `+0.099`
- stricter research point:
  - threshold `0.20`
  - coverage `0.124`
  - selective accuracy `0.306`
  - gain vs always-answer `+0.162`

Immediate next work:

1) freeze `0.15` as the default math selective-answer policy
2) keep `0.20` as the stricter research point
3) only then revisit escalation against the stronger baseline

Current next experiment:

- Qwen-only math uplift A/B under the same contract
  - control: base `Qwen/Qwen2.5-Math-1.5B-Instruct`
  - treatment: lightly fine-tuned Qwen math checkpoint on
    `datasets_hq_v2_curated/math_specialist`
  - compare always-answer accuracy first, then probe quality and selected policy

Current read:

- The fine-tuned Qwen math checkpoint improves always-answer accuracy.
- The confidence probe weakens on top of that checkpoint.
- Next step is to measure confidence stability on the fine-tuned model before
  promoting it as the new active baseline.

Current confidence redesign hypothesis:

- The fine-tuned model needs contract-aware confidence features, not just the
  original 7 generation stats.
- Next probe experiment adds math-contract answer features on top of the
  existing feature vector and compares that probe against the current one on
  the same fine-tuned checkpoint.

Current read on that redesign:

- `probe v2` improves confidence quality on the fine-tuned model.
- The best policy still comes through `escalation_selective`.
- Next gate is stability across seeds before any promotion decision.

Current promoted math baseline:

- answer model: fine-tuned `Qwen/Qwen2.5-Math-1.5B-Instruct`
- confidence head: `probe v2` with math-contract features
- operating mode: `escalation`
- threshold: `0.20`

Current stability summary:

- coverage mean: `0.853`
- selective accuracy mean: `0.256`
- overall accuracy mean: `0.218`
- gain vs always-answer mean: `+0.056`

Next domain after math:

- code under an execution-aware confidence contract
- keep the same principle:
  - answer quality first
  - learned correctness estimate second
  - control behavior third
- see `lumina_basic/notes/code_confidence_next_steps.md`

Immediate code tasks now completed:

- `code_confidence_contract.md`
- `eval_code_confidence.py`

Current code read:

- the original loose code path was blocked mostly by bad output contract
- strict code-only prompting + extraction materially improved execution:
  - syntax-valid `0.37 -> 0.97`
  - pass rate `0.10 -> 0.19`
  - `AUROC 0.46 -> 0.58`
- benchmark-aware callable alignment then improved pass rate again:
  - pass rate `0.19 -> 0.28`
- shape cleanup did not help:
  - pass rate `0.28 -> 0.26`
- the dominant remaining failure mode is now clearly semantic correctness

Next code step:

- preserve the frozen strict contract + callable alignment
- rebuild the answer model on a Python-only, benchmark-shaped dataset under the
  same strict contract
- rerun the execution-aware baseline before building a learned code confidence
  probe

Current code read:

- the Python-contract answer-model uplift worked:
  - pass rate `0.26 -> 0.37`
  - `HumanEval` pass `0.30 -> 0.38`
  - `MBPP` pass `0.22 -> 0.36`
- confidence still does not rank correctness well enough

Next code step:

- freeze the Python-contract answer model
- train a learned code confidence probe on execution labels
- only then test thresholded code policies

Current code confidence read:

- `code_probe_v1` is a real positive:
  - eval `AUROC`: `0.716`
  - eval `ECE`: `0.124`
- likely default threshold candidate:
  - `0.40`
- stricter research point:
  - `0.50`

Next code step:

- run stability across shuffled benchmark slices
- then freeze the default code selective-answer threshold

### Phase C — Branching only if A/B pass

Only revisit branching or disagreement if confidence has already shown value in
single-model form.

## Existing prototype commands

Smoke:

```bash
bash lumina_basic/tools/run_basic_smoke.sh
```

Disagreement probe:

```bash
bash lumina_basic/tools/run_disagreement_signal.sh
```
