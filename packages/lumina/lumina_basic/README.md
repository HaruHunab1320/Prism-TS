# Lumina Basic (Single-Model Confidence-Head)

This directory is for the original Lumina architecture:
- A single model with confidence heads
- Confidence-based branching / pruning / escalation

Status: prototype implemented; active research plan reset to a stricter
single-model confidence validation path.

## Run smoke eval
From `packages/lumina/`:

```bash
bash lumina_basic/tools/run_basic_smoke.sh
```

Disagreement-signal check:

```bash
bash lumina_basic/tools/run_disagreement_signal.sh
```

Optional environment overrides:
- `LUMINA_BASIC_MODEL` (default `distilgpt2`)
- `LUMINA_BASIC_CONF_HEADS` (default `3`)
- `LUMINA_BASIC_MAX_NEW_TOKENS` (default `24`)
- `LUMINA_BASIC_ANSWER_CONF` (default `0.50`)
- `LUMINA_BASIC_OUTPUT_JSON` (default `lumina_basic/notes/smoke_latest.json`)

## Current components
- `models/confidence_model.py`: single model + confidence heads
- `inference/branching.py`: branch policy (prune/escalate/answer)
- `evaluation/smoke_eval.py`: baseline vs branching A/B on a tiny QA set
- `evaluation/eval_disagreement_signal.py`: tests whether high-confidence disagreement is useful signal

See `notes/plan.md` for next phase gates.
See `notes/reset_plan_2026-03-27.md` for the current reset plan.
