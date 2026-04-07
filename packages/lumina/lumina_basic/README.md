# Lumina Basic (Single-Model Confidence-Head)

This directory is for the original Lumina architecture:
- A single model with confidence heads
- Confidence-based branching / pruning / escalation

Status: prototype implemented; active path is now the promoted math-contract
baseline built on a fine-tuned Qwen math checkpoint plus `probe v2`.

## Run smoke eval
From `packages/lumina/`:

```bash
bash lumina_basic/tools/run_basic_smoke.sh
```

Disagreement-signal check:

```bash
bash lumina_basic/tools/run_disagreement_signal.sh
```

Math confidence contract baseline:

```bash
bash lumina_basic/tools/run_math_confidence.sh
```

This path now prefers the promoted local math baseline when present:

- model: `lumina_multimodel/outputs_gen/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen`
- confidence head: `probe v2` on the fine-tuned model

If those artifacts are not present locally, the scripts fall back to:

- `Qwen/Qwen2.5-Math-1.5B-Instruct`

Train learned math confidence head:

```bash
bash lumina_basic/tools/run_train_math_confidence_head.sh
```

Select an operating threshold from the latest math eval:

```bash
bash lumina_basic/tools/select_math_confidence_policy.sh
```

Select a threshold from the scaled-probe eval:

```bash
bash lumina_basic/tools/select_math_confidence_policy_scaled.sh
```

Current promoted math operating point:

- mode: `escalation`
- threshold: `0.20`
- stability summary:
  - coverage mean: `0.853`
  - selective accuracy mean: `0.256`
  - overall accuracy mean: `0.218`
  - gain vs always-answer mean: `+0.056`

Evaluate one fixed policy point directly:

```bash
bash lumina_basic/tools/eval_math_confidence_policy.sh
```

Run the promoted math path and emit Prism-facing metadata:

```bash
LUMINA_BASIC_QUESTION="If 2x = 10, what is x?" \
bash lumina_basic/tools/run_math_with_metadata.sh
```

Run the structured verification-style escalation experiment locally:

```bash
bash lumina_basic/tools/run_math_structured_escalation.sh
```

Optional environment overrides:
- `LUMINA_BASIC_MODEL` (defaults to the promoted fine-tuned local math checkpoint when present)
- `LUMINA_BASIC_CONFIDENCE_HEAD` (defaults to the promoted `probe v2` checkpoint when present)
- `LUMINA_BASIC_CONF_HEADS` (default `3`)
- `LUMINA_BASIC_MAX_NEW_TOKENS` (default `24`)
- `LUMINA_BASIC_ANSWER_CONF` (default `0.20`)
- `LUMINA_BASIC_OUTPUT_JSON` (default `lumina_basic/notes/smoke_latest.json`)

## Current components
- `models/confidence_model.py`: single model + confidence heads
- `inference/branching.py`: branch policy (prune/escalate/answer)
- `evaluation/smoke_eval.py`: baseline vs branching A/B on a tiny QA set
- `evaluation/eval_disagreement_signal.py`: tests whether high-confidence disagreement is useful signal
- `evaluation/eval_math_confidence.py`: math-only confidence contract baseline
- `evaluation/eval_math_confidence_policy.py`: evaluate one fixed thresholded policy point
- `evaluation/eval_math_confidence_structured_escalation.py`: structured verification-style escalation check
- `evaluation/select_math_confidence_policy.py`: choose a thresholded selective-answer policy from sweep results
- `inference/math_runtime.py`: promoted math runtime with Prism-facing metadata output
- `training/train_math_confidence_head.py`: learned correctness/confidence probe for the math contract

Current promotion status:

- promoted:
  - fine-tuned Qwen math answer model
  - `probe v2` with contract-aware answer features
  - escalation policy at `threshold 0.20`
- archived as prior baseline:
  - unfine-tuned Qwen selective-answer policy at `threshold 0.15`

See `notes/plan.md` for next phase gates.
See `notes/reset_plan_2026-03-27.md` for the current reset plan.
See `notes/prism_confidence_metadata_contract.md` for the Prism-facing metadata contract.
See `notes/prism_language_note.md` for the language/runtime separation.
See `notes/code_confidence_next_steps.md` for the next code-domain path.
