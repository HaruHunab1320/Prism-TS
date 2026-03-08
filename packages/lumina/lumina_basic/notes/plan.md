# Lumina Basic Plan (Single-Model Confidence-Head)

## Goal
Validate the single-model architecture with confidence heads and branching:
- prune low-confidence paths
- escalate on high-confidence disagreement
- measure accuracy and abstention behavior

## Phase 1 — Minimal multi-head confidence prototype
Status: complete (prototype).

1) Implement a small GPT-2 wrapper with N confidence heads. ✅
2) Define a branching policy. ✅
   - if max conf < threshold → abstain
   - if top-2 disagree and both high conf → escalate
3) Add a smoke eval that compares. ✅
   - single head vs multi-head
   - with/without branching

## Phase 2 — Calibration + disagreement handling
1) Calibrate confidence heads on val data.
2) Test if calibration improves:
   - abstention accuracy
   - disagreement resolution

## Phase 3 — End-to-end demo
1) Single-model inference loop with branching.
2) Log decisions (prune/escalate/answer).
3) Compare against multi-model baseline.

## Current smoke command
```bash
bash lumina_basic/tools/run_basic_smoke.sh
```

## Disagreement signal test
```bash
bash lumina_basic/tools/run_disagreement_signal.sh
```
