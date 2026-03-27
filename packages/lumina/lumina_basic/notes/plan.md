# Lumina Basic Plan (Single-Model Confidence-Head)

## Status

Prototype exists, but the research plan has been reset.

Active direction:

- validate confidence as a useful control signal in a single-model setting
- postpone multimodel branching claims until that is proven

See:

- `lumina_basic/notes/reset_plan_2026-03-27.md`

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

### Phase B — Control-action validation

1) Compare:
   - always answer
   - abstain below threshold
   - escalate below threshold
2) Require confidence to improve a real decision, not just metadata quality.

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
