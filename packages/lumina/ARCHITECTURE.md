# Lumina Architecture (v2): Specialist Network + Prism Orchestration

## Purpose
Lumina is a specialist network architecture designed to deliver high accuracy and calibrated confidence at lower training cost than monolithic models. Prism provides the orchestration policy layer (routing, confidence gating, aggregation, abstention) that makes the network coherent and testable.

This document is the canonical system architecture and interface contract.

---

## Core Hypothesis (Falsifiable)
A network of small, well-calibrated specialist models, routed and aggregated by explicit confidence policy, can match or exceed a single larger general model on targeted domains while reducing cost and improving calibration.

## Core Thesis (What Must Be True)
Lumina’s novelty hinges on **calibrated, reliable confidence/uncertainty signals**. Routing, branching, and aggregation are only valuable if the system’s confidence estimates correlate with correctness and reflect uncertainty type (epistemic vs aleatoric vs OOD). If confidence is uncalibrated, the architecture collapses into either perpetual abstention or overconfident errors. Therefore, confidence calibration is the primary research bottleneck and must be validated before scaling.

---

## System Overview

Components:
1. Router (Lumina): predicts candidate domains and confidence.
2. Specialists (Lumina): domain experts that return answer + decomposed confidence.
3. Aggregator (Lumina or policy): resolves conflicts, synthesizes, or abstains.
4. Prism Orchestration: enforces confidence policy and branching logic.

Dataflow:
Query -> Router -> Specialists -> Aggregator/Policy -> Final response + confidence + provenance.

---

## Component Interfaces (Confidence Contract)

All components emit a common structure:

```
{
  "value": <response>,
  "confidence": {
    "overall": float in [0,1],
    "epistemic": float in [0,1],
    "aleatoric": float in [0,1],
    "distribution_shift": float in [0,1],
    "primary_type": "high_confidence"|"epistemic"|"aleatoric"|"out_of_distribution"
  },
  "domain": <string>,
  "metadata": {
    "model_id": <string>,
    "version": <string>,
    "token_count": <int>
  }
}
```

Invariants:
- overall decreases when any uncertainty channel increases (monotonic policy).
- distribution_shift is specialist-specific (OOD relative to that specialist).
- overall is calibrated: P(correct | overall ~= p) ~= p.

---

## Router

Purpose:
- Identify which specialists are likely to be most confident.

Outputs:
```
{
  "domain": "prism",
  "confidence": 0.83,
  "alternatives": [
    {"domain": "math", "confidence": 0.10},
    {"domain": "general", "confidence": 0.07}
  ]
}
```

Routing Policy (high-level):
- If router confidence >= high threshold: call 1 specialist.
- If between high/medium: call top-K specialists.
- If below medium: call all specialists and aggregate.

---

## Specialists

Purpose:
- Produce domain-specific answers and calibrated uncertainty.

Model characteristics:
- Decoder-only transformer.
- Confidence head emits: overall, epistemic, aleatoric, distribution_shift.

Specialist training focus:
- In-domain correctness.
- Calibration quality (ECE, Brier).
- OOD detection for domain boundary.

---

## Aggregator

Two-stage design:
1. Policy layer: rules over confidence and agreement.
2. Model layer: optional learned synthesis from multiple responses.

Aggregation policy (baseline):
- If high agreement and high confidence: choose best response.
- If disagreement above threshold: synthesize or abstain.
- If all confidence low: abstain or request context.

---

## Prism Orchestration

Prism is the control plane. It encodes branching and confidence policy as code.
Reference pattern: `patterns/lumina_network.prism`.

Prism-level responsibilities:
- Confidence gating (thresholds)
- Parallelism (call multiple specialists)
- Disagreement detection
- Escalation/abstention behavior

---

## Metrics (Architecture-Level)

Calibration:
- ECE <= 0.05 per specialist
- Brier <= 0.10 per specialist

Routing:
- Top-1 routing accuracy >= 0.90
- Top-K recall (K=3) >= 0.98

OOD:
- AUROC >= 0.85
- False confident rate <= 0.10

Aggregator:
- Conflict resolution accuracy >= 0.80
- Abstention correctness >= 0.70

---

## Deployment Phases

- Phase 0: Local PoC (Mac) with tiny models.
- Phase 1: Local scaled training (tokenizer + larger data).
- Phase 2: Limited cloud training (A100/H100) for one domain.
- Phase 3: Multi-domain deployment + online evaluation.

See `BLUEPRINT.md` for the full plan.

---

## Risks

- Routing errors dominate system performance.
- Calibration drift under distribution shift.
- Aggregation may amplify confident errors.
- OOD definition is specialist-relative (hard to standardize).

---

## Next Documents

- `WHITEPAPER.md` (theory + testing protocols)
- `BLUEPRINT.md` (phases + checklists + benchmarks)
- `MATHEMATICAL_FOUNDATIONS.md` (detailed math)
