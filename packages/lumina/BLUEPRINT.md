# Lumina Program Blueprint (Local -> H100)

This is the execution plan for validating the Lumina specialist network from Mac PoC to multi-GPU training.

---

## Phase 0: Architecture and Policy Lock

Goal: Freeze interfaces, confidence contract, and Prism orchestration pattern.

Inputs:
- `ARCHITECTURE.md`
- `patterns/lumina_network.prism`

Steps:
1. Review confidence contract and thresholds.
2. Define routing policy (top-K, thresholds, abstain behavior).
3. Define aggregator policy (agreement threshold, synthesize vs abstain).

Exit checklist (falsifiable):
- [ ] Confidence contract is defined and versioned
- [ ] Routing policy test cases written
- [ ] Aggregation policy test cases written
- [ ] Prism pattern runs in Prism runtime (smoke test)

---

## Phase 1: Local PoC (Tiny Models)

Goal: Validate the paradigm with tiny models on a Mac.

Inputs:
- `lumina_basic/` pipeline

Steps:
1. Generate datasets (router + specialists + OOD + aggregation).
2. Train specialists (prism, math, general).
3. Train router (add training script if missing).
4. Implement aggregator policy (rule-based baseline).
5. Run evaluation.

Success benchmarks:
- Router accuracy >= 0.85
- Specialist ECE <= 0.10
- OOD AUROC >= 0.75
- False confident rate <= 0.15
- End-to-end accuracy >= 0.80 (on mixed-domain set)

Exit checklist:
- [ ] Router training artifacts saved
- [ ] Specialist calibration report generated
- [ ] OOD results reported
- [ ] Aggregation conflict tests pass

---

## Phase 2: Local Scaled Training (Tokenizer-based)

Goal: Improve realism and test calibration at scale on local hardware.

Inputs:
- `lumina_basic/` v2 pipeline

Steps:
1. Generate v2 data (tokenizer-based).
2. Train specialists at small/medium size.
3. Add router training (v2).
4. Expand evaluation set with harder tasks.

Benchmarks:
- Specialist ECE <= 0.07
- OOD AUROC >= 0.80
- False confident rate <= 0.12

Exit checklist:
- [ ] v2 specialists trained and reproducible
- [ ] Router accuracy >= 0.88
- [ ] Aggregation policy tested on disagreement sets

---

## Phase 3: Limited Cloud Training (A100/H100)

Goal: Validate training at scale on one or two domains.

Steps:
1. Train one domain specialist (100M-500M params).
2. Train router on expanded data.
3. Compare to baseline monolithic model.

Benchmarks:
- Specialist accuracy >= baseline + 3%
- Specialist ECE <= 0.05
- OOD AUROC >= 0.85

Exit checklist:
- [ ] Cost and performance report
- [ ] Calibration metrics pass
- [ ] End-to-end tests with Prism orchestration

---

## Phase 4: Multi-Domain Expansion

Goal: Deploy multiple specialists with aggregator model.

Steps:
1. Train 3-5 specialists in parallel.
2. Train aggregator model on conflict sets.
3. Run full system evaluation.

Benchmarks:
- Network accuracy >= best single specialist
- False confident rate <= 0.08
- Aggregator conflict resolution >= 0.85

Exit checklist:
- [ ] System passes evaluation suite
- [ ] Failure mode analysis complete
- [ ] Deployment readiness review

---

## Phase 5: Productionization

Goal: Monitoring, retraining, and governance.

Steps:
1. Build online eval harness.
2. Add drift detection (OOD + calibration drift).
3. Automate retraining pipeline.

Exit checklist:
- [ ] Monitoring dashboards live
- [ ] Retraining triggers defined
- [ ] Incident response policy

---

## Falsifiable Global Gates

Proceed to cloud training only if:
- Local PoC benchmarks pass (Phase 1 and 2)
- Confidence calibration is stable across domains
- Routing accuracy exceeds 0.88 on mixed domain evaluation

Hybrid routing readiness:
- Hybrid routing (router + confidence) >= 0.80 on 3-way (>= 1000 samples)
- Router-only baseline >= 0.75 on 3-way
- Confidence-only routing >= 0.40 on 3-way (signal present)

Current status (2026-01-31):
- Hybrid 0.810, Router 0.772, Confidence 0.398 (999 samples)

---

## Artifacts To Keep Current

- `ARCHITECTURE.md`
- `WHITEPAPER.md`
- `BLUEPRINT.md`
- `patterns/lumina_network.prism`
- `lumina_basic/logs/training_log.md`
- `lumina_basic/logs/milestones.md`
- Evaluation reports under `lumina_basic/outputs*`

---

## Current Milestone Snapshot (Local)

Date: 2026-01-31

Latest results (non-gate, tracking only):
- Routing proxy accuracy (general vs math, GPT2+confidence): 0.58 @ 200 samples
- OOD AUROC (general): 0.50 @ 500 samples
- Confidence MSE to target_conf (calibrated): 0.0101

Interpretation:
- Routing > chance achieved, still below Phase 1 gate (0.85).
- OOD detection trending upward, still below Phase 1 gate (0.75).
