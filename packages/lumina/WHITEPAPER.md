# Lumina Specialist Network: Theory, Training, and Evaluation (Whitepaper)

## Abstract
This paper defines the Lumina specialist network architecture, its uncertainty decomposition, and a falsifiable experimental program to test whether a network of small, calibrated models can match or exceed a larger monolithic model on targeted domains. We specify interfaces, training objectives, datasets, and evaluation protocols from local Mac PoC to H100-scale training.

---

## 1. Problem Statement
Large monolithic language models are expensive to train and calibrate. In domain-specific tasks, they often exhibit confident errors and weak out-of-distribution (OOD) detection. We propose a modular alternative:

- Train small specialist models per domain.
- Route queries based on predicted confidence, not only domain labels.
- Aggregate responses with explicit confidence policy.
- Use Prism to encode routing and aggregation logic as testable programs.

**Primary question (falsifiable):**
Can a network of calibrated specialists + routing policy match or exceed a monolithic model on targeted domains, with lower cost and improved confidence calibration?

---

## 2. Formalization

### 2.1 Data
Let D be the global dataset of (x, y) pairs. Let D_i denote domain-specific subsets.

### 2.2 Specialists
Each specialist i defines a predictive distribution:

p_i(y | x) and confidence c_i(x) in [0,1]

Each specialist also predicts uncertainty components:

u_i(x) = (u_ep, u_al, u_ood)

### 2.3 Router
The router predicts a distribution over specialists:

r(i | x)

Routing uses confidence-aware policy:

If max_i r(i|x) >= tau_high: call argmax i
If tau_med <= max_i r(i|x) < tau_high: call top-K i
If max_i r(i|x) < tau_med: call all specialists

### 2.4 Aggregation
Let S be the set of specialists called for x. Each returns (y_i, c_i, u_i).

Baseline aggregation policy:
- If agreement(y_i) >= alpha and max c_i >= tau_high: return best y_i
- Else if max c_i < tau_low: abstain or request clarification
- Else: synthesize using aggregator model A(y_1..y_k, c_1..c_k, u_1..u_k)

---

## 3. Uncertainty and Calibration

We treat confidence as a calibrated probability of correctness:

P(y_i correct | c_i = p) ~= p

Uncertainty decomposition is modeled as:

logit(c_i) = b - a*u_ep - b2*u_al - b3*u_ood

Constraints:
- d c_i / d u_k <= 0 for each uncertainty channel
- u_ood is specialist-relative (OOD w.r.t. D_i)

Calibration metrics:
- Expected Calibration Error (ECE)
- Brier score
- Negative log-likelihood (NLL)
- Selective prediction accuracy at coverage k (Acc@k)

---

## 4. Hypotheses and Tests (Falsifiable)

H1: Specialists outperform a baseline general model on in-domain tasks.
- Null: Specialists do not exceed baseline accuracy.
- Test: Paired accuracy comparison on domain benchmarks.

H2: Specialist confidence is better calibrated than baseline.
- Null: ECE and Brier are not improved.
- Test: Compare ECE, Brier across models.

H3: Routing improves overall network accuracy vs single best specialist.
- Null: Routing does not improve end-to-end accuracy.
- Test: Evaluate full pipeline vs best single specialist.

H4: OOD detection is better with specialists.
- Null: AUROC for OOD is not improved.
- Test: AUROC and false confident rate on OOD sets.

H5: Aggregation reduces confident errors under disagreement.
- Null: Aggregation does not reduce false confident rate.
- Test: Error rate on disagreement subsets with and without aggregator.

---

## 5. Training Protocols

### 5.1 Specialist Training
Objective:
L_total = L_lm + lambda_calib * L_calib + lambda_unc * L_unc + lambda_sharp * L_sharp

- L_lm: token-level cross entropy
- L_calib: proper scoring rule (BCE on correctness)
- L_unc: proxy supervision for uncertainty channels
- L_sharp: penalize uniform uncertainty (encourage confidence when correct)

### 5.2 Router Training
Two-stage:
1) Domain classification pretraining on D_i labels.
2) Calibration training using specialist performance signals.

Loss:
L_router = CE(domain) + lambda * MSE(pred_conf, realized_conf)

### 5.3 Aggregator Training (optional)
Input: (y_i, c_i, u_i) for i in S, plus query x.
Target: synthesized answer or abstain.

Loss:
- Supervised summary loss + calibration loss on final confidence.

---

## 6. Datasets

### 6.1 Domain Datasets (examples)
- Prism: internal language corpus, compiler tests, reference docs, examples.
- Code: curated GitHub + internal code patterns.
- Math: GSM8K, MATH, or internal math problems.
- General: curated Q/A, encyclopedia-style corpora.

### 6.2 OOD Sets
- Cross-domain queries (e.g., medical for non-med specialist).
- Adversarial or ambiguous prompts.

### 6.3 Calibration Labels
- Correctness at token level
- Difficulty tags or ambiguity proxies where available

---

## 7. Evaluation Protocol

### 7.1 Metrics
- Accuracy, F1 (task-specific)
- ECE, Brier, NLL
- AUROC for OOD
- False confident rate (confidence > tau but incorrect)
- Abstention quality (correct abstain rate)

### 7.2 Benchmarks
- In-domain test sets for each specialist.
- Mixed-domain routing evaluation.
- OOD stress tests.
- Conflict sets with intentionally ambiguous queries.

### 7.3 Statistical Testing
- Use paired tests for accuracy (McNemar or paired bootstrap).
- Confidence intervals via bootstrap.
- Minimum effect size thresholds for decision gates.

---

## 8. Local-First PoC (Mac)

Goal: Validate routing + calibration + OOD + basic aggregation.

Minimum success criteria:
- Router accuracy >= 0.85
- Specialist ECE <= 0.10
- OOD AUROC >= 0.75
- False confident rate <= 0.15

---

## 9. Scale-Up (H100)

Phase targets:
- Increase parameters to 100M-500M per specialist
- Train router on larger multi-domain corpora
- Add aggregator model

Scale gate:
- All local metrics must pass
- Cost estimate + training plan approved

## 9.1 Local Milestone Gates (Mac-first)

Before H100 training, we require these local signals:
1) **Routing signal > chance**: confidence-based routing accuracy ≥ 0.55 on mixed-domain prompts (≥200 samples).
2) **Confidence calibration**: post-hoc calibration reduces MSE to target_conf (NLL-derived) below 0.02.
3) **OOD detection**: AUROC ≥ 0.70 on hard OOD for at least one domain.

These gates validate the core premise: confidence is meaningful enough to support routing and abstention.

---

## 10. Risks and Mitigations

- Routing errors: mitigate with confidence-aware routing + top-K fallbacks
- Calibration drift: ongoing recalibration with new data
- Aggregator amplification: include abstain policies and disagreement thresholds

---

## 11. Deliverables

- Trained specialists + router + aggregator
- Evaluation report with metrics + confidence intervals
- Prism orchestration pattern validated in end-to-end tests

---

## Appendix A: Confidence Contract

Every response is a tuple:
(value, confidence) where confidence includes overall + three uncertainty channels.

This contract is enforced in Prism and used for routing, aggregation, and abstention.
