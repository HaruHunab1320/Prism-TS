# Lumina: Mathematical Foundations (v2)

## Abstract

This document provides rigorous mathematical foundations for:
1. **Lumina** - An uncertainty-aware language model with decomposed uncertainty estimation
2. **Specialist Network** - A mixture-of-experts architecture with confidence-aware routing

---

## Part I: Lumina Core Architecture

### 1.1 Problem Formulation

Standard language models learn a distribution $p(y|x)$ where $x$ is the input sequence and $y$ is the target. They provide no intrinsic measure of uncertainty in their predictions.

**Lumina's objective:** Learn both $p(y|x)$ and calibrated uncertainty estimates that decompose into interpretable channels.

### 1.2 Uncertainty Decomposition

We estimate **one confidence** and **three uncertainty channels**:

$$c_{\text{overall}}(x) \in [0,1] \quad \text{(higher = more confident, better)}$$

$$\mathbf{u}(x) = \begin{bmatrix} u_{\text{epistemic}}(x) \\ u_{\text{aleatoric}}(x) \\ u_{\text{ood}}(x) \end{bmatrix} \in [0,1]^3 \quad \text{(higher = more uncertain, worse)}$$

| Channel | Symbol | Interpretation | Reducible? |
|---------|--------|----------------|------------|
| Overall Confidence | $c_{\text{overall}}$ | Calibrated P(correct) | - |
| Epistemic Uncertainty | $u_{\text{epistemic}}$ | Model doesn't know (knowledge gap) | Yes (more data/capacity) |
| Aleatoric Uncertainty | $u_{\text{aleatoric}}$ | Task is inherently ambiguous | No (irreducible) |
| Distribution Shift | $u_{\text{ood}}$ | Input is unlike training data | Yes (expand distribution) |

**Important:** These channels are **separately estimated**, not orthogonal. In practice:
- OOD inputs typically spike $u_{\text{epistemic}}$
- Ambiguous tasks can appear epistemic
- Correlations are expected and acceptable

We optionally add a **decorrelation regularizer** to encourage the channels to capture distinct signals:

$$\mathcal{L}_{\text{decorr}} = \sum_{i < j} |\text{Corr}(u_i, u_j)|$$

### 1.3 Confidence-Uncertainty Relationship

The relationship between confidence and uncertainties is constrained in **logit space** to guarantee $c_{\text{overall}} \in (0, 1)$:

$$\text{logit}(c_{\text{overall}}) = b - \alpha \cdot u_{\text{epistemic}} - \beta \cdot u_{\text{aleatoric}} - \gamma \cdot u_{\text{ood}}$$

$$c_{\text{overall}} = \sigma\left(b - \alpha \cdot u_{\text{epistemic}} - \beta \cdot u_{\text{aleatoric}} - \gamma \cdot u_{\text{ood}}\right)$$

Where:
- $b$ is a learned bias (base confidence)
- $\alpha, \beta, \gamma > 0$ are learned mixing coefficients
- $\sigma(\cdot)$ is the sigmoid function

This formulation ensures:
- Output is always in valid range $(0, 1)$
- Gradients are well-behaved
- Higher uncertainties → lower confidence (monotonic)

**Alternative (simplex budget):** Enforce $\sum_k w_k u_k \leq 1$ via constrained optimization, then $c_{\text{overall}} = 1 - \sum_k w_k u_k$.

### 1.4 Theoretical Grounding: Uncertainty Decomposition

The standard decomposition of predictive uncertainty for a model with parameters $\theta$ and training data $\mathcal{D}$ is:

$$H[Y|X, \mathcal{D}] = \underbrace{\mathbb{E}_{p(\theta|\mathcal{D})}[H[Y|X, \theta]]}_{\text{expected entropy (aleatoric-like)}} + \underbrace{I(Y; \theta | X, \mathcal{D})}_{\text{mutual information (epistemic-like)}}$$

Where:
- $H[Y|X, \theta]$ is the entropy of predictions under fixed parameters
- The expectation captures **aleatoric** uncertainty (irreducible given the model class)
- The mutual information $I(Y; \theta | X, \mathcal{D})$ captures **epistemic** uncertainty (reducible with more data)

**Our approximation:** Since exact Bayesian inference over $p(\theta|\mathcal{D})$ is intractable for large models, we learn **proxy heads** that estimate these quantities:

| Target | Proxy Estimation Method |
|--------|------------------------|
| $u_{\text{epistemic}}$ | Ensemble disagreement, MC-dropout variance, or learned predictor |
| $u_{\text{aleatoric}}$ | Predictive entropy $H[\hat{Y}|X]$, or label ambiguity when available |
| $u_{\text{ood}}$ | Energy score, Mahalanobis distance, or learned OOD classifier |

These are **learned heuristics**, not exact decompositions. The heads are trained to correlate with the theoretical quantities but are not provably equivalent.

### 1.5 Model Architecture

#### Base Transformer

Given input tokens $\mathbf{x} = (x_1, ..., x_T)$:

$$\mathbf{h}^{(0)} = \text{Embed}(\mathbf{x}) + \text{PE}(\mathbf{x})$$

For each layer $\ell \in \{1, ..., L\}$:

$$\mathbf{h}^{(\ell)} = \text{TransformerBlock}^{(\ell)}(\mathbf{h}^{(\ell-1)})$$

Where each block applies pre-norm residual connections:

$$\begin{aligned}
\mathbf{z} &= \mathbf{h}^{(\ell-1)} + \text{Attention}(\text{LN}(\mathbf{h}^{(\ell-1)})) \\
\mathbf{h}^{(\ell)} &= \mathbf{z} + \text{FFN}(\text{LN}(\mathbf{z}))
\end{aligned}$$

#### Attention with RoPE

$$\mathbf{Q} = \mathbf{h}W_Q, \quad \mathbf{K} = \mathbf{h}W_K, \quad \mathbf{V} = \mathbf{h}W_V$$

Rotary Position Embedding:

$$\text{RoPE}(\mathbf{q}_m, m) = \mathbf{q}_m \odot \cos(m\boldsymbol{\theta}) + \text{rotate}(\mathbf{q}_m) \odot \sin(m\boldsymbol{\theta})$$

Where $\theta_i = 10000^{-2i/d}$.

#### Feed-Forward with SwiGLU

$$\text{FFN}(\mathbf{x}) = (\text{SiLU}(\mathbf{x}W_{\text{gate}}) \odot \mathbf{x}W_{\text{up}})W_{\text{down}}$$

#### Language Model Head

$$p(x_{t+1}|x_{\leq t}) = \text{softmax}(\mathbf{h}_t^{(L)} W_{\text{lm}})$$

### 1.6 Uncertainty Head (Per-Token)

**Critical design choice:** We compute uncertainty **per-token**, not per-sequence, because:
- LM loss is token-level
- Correctness is token-level
- Calibration metrics are defined per-prediction

From each hidden state $\mathbf{h}_t^{(L)}$:

$$\begin{aligned}
\mathbf{z}_{c,t} &= \text{GELU}(\text{LN}(\mathbf{h}_t^{(L)})W_c^{(1)}) \\
\tilde{c}_t &= \mathbf{z}_{c,t} W_{\text{conf}} \quad \text{(logit)} \\
\tilde{u}_{\text{ep},t} &= \mathbf{z}_{c,t} W_{\text{ep}} \\
\tilde{u}_{\text{al},t} &= \mathbf{z}_{c,t} W_{\text{al}} \\
\tilde{u}_{\text{ood},t} &= \mathbf{z}_{c,t} W_{\text{ood}}
\end{aligned}$$

Apply sigmoid to get probabilities:

$$u_{\text{ep},t} = \sigma(\tilde{u}_{\text{ep},t}), \quad u_{\text{al},t} = \sigma(\tilde{u}_{\text{al},t}), \quad u_{\text{ood},t} = \sigma(\tilde{u}_{\text{ood},t})$$

Overall confidence via logit-space combination:

$$c_t = \sigma\left(\tilde{c}_t - \alpha \cdot u_{\text{ep},t} - \beta \cdot u_{\text{al},t} - \gamma \cdot u_{\text{ood},t}\right)$$

**Aggregation for different use-cases:**
- **Token-level:** Use $c_t$ directly (best for calibration metrics)
- **Span/answer-level:** $c_{\text{span}} = \min_{t \in \text{span}} c_t$ or $\text{mean}$
- **Sequence-level:** $c_{\text{seq}} = \frac{1}{T}\sum_t c_t$ (for agent outputs)

### 1.7 Training Objective

$$\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{lm}} + \lambda_{\text{calib}}\mathcal{L}_{\text{calib}} + \lambda_{\text{unc}}\mathcal{L}_{\text{unc}} + \lambda_{\text{sharp}}\mathcal{L}_{\text{sharp}}$$

#### Language Modeling Loss

$$\mathcal{L}_{\text{lm}} = -\frac{1}{T}\sum_{t=1}^{T} \log p(x_t | x_{<t})$$

#### Calibration Loss (Binary Cross-Entropy)

We use BCE as the proper scoring rule (not L1):

$$\mathcal{L}_{\text{calib}} = -\frac{1}{T}\sum_{t=1}^{T} \left[ y_t \log c_t + (1 - y_t) \log(1 - c_t) \right]$$

Where $y_t = \mathbb{1}[\hat{x}_t = x_t]$ is the correctness indicator.

**Why BCE over L1:** BCE is a proper scoring rule (minimized at true probabilities), has better gradient behavior near 0/1, and is the standard in calibration literature.

#### Uncertainty Channel Loss

Train uncertainty heads against proxy targets:

$$\mathcal{L}_{\text{unc}} = \frac{1}{3}\sum_{k \in \{\text{ep}, \text{al}, \text{ood}\}} \text{BCE}(u_k, \hat{u}_k)$$

**Target estimation (see Section 1.8):**
- $\hat{u}_{\text{ep}}$: ensemble/MC-dropout disagreement proxy
- $\hat{u}_{\text{al}}$: normalized predictive entropy
- $\hat{u}_{\text{ood}}$: supervised OOD labels (in-distribution vs known-OOD)

#### Sharpness Loss (Prevents Collapse)

**Problem:** A model can minimize calibration loss by predicting $c_t \approx \text{base\_rate}$ everywhere (always uncertain). This is degenerate.

**Solution:** Encourage confident predictions when the model is actually correct:

$$\mathcal{L}_{\text{sharp}} = -\frac{1}{T}\sum_{t=1}^{T} y_t \cdot \log c_t$$

This rewards high confidence on correct predictions, preventing collapse to uniform uncertainty.

**Alternative (selective prediction objective):** Optimize for accuracy at fixed coverage:
$$\text{maximize} \quad \text{Acc}@\kappa = \text{accuracy on top-}\kappa\%\text{ by confidence}$$

### 1.8 Target Estimation for Uncertainty Channels

Since we rarely have ground-truth uncertainty labels, we estimate targets:

#### Epistemic Uncertainty Target $\hat{u}_{\text{ep}}$

**Option A (Ensemble):** Train $M$ models, measure disagreement:
$$\hat{u}_{\text{ep},t} = 1 - \frac{1}{M}\sum_{m=1}^{M} \mathbb{1}[\hat{x}_t^{(m)} = \text{mode}(\hat{x}_t^{(1:M)})]$$

**Option B (MC-Dropout):** Run $M$ forward passes with dropout, measure variance:
$$\hat{u}_{\text{ep},t} = \text{Var}_{m}[p^{(m)}(x_t | x_{<t})]$$

**Option C (Single-model heuristic):** Use gradient magnitude or attention entropy as proxy.

#### Aleatoric Uncertainty Target $\hat{u}_{\text{al}}$

Normalized predictive entropy:
$$\hat{u}_{\text{al},t} = \frac{H[\hat{p}_t]}{\log V} = -\frac{1}{\log V}\sum_{v=1}^{V} p_t(v) \log p_t(v)$$

Where $V$ is vocabulary size. High entropy = ambiguous prediction.

**If multiple references available:** Use label disagreement rate.

#### OOD Target $\hat{u}_{\text{ood}}$

**Supervised approach:** Create a held-out OOD dataset (different domain), train binary classifier:
- In-distribution examples: $\hat{u}_{\text{ood}} = 0$
- Known-OOD examples: $\hat{u}_{\text{ood}} = 1$

**Unsupervised approaches:**
- Energy score: $\hat{u}_{\text{ood}} = -\log \sum_v \exp(z_v)$
- Mahalanobis distance in embedding space
- Reconstruction error from autoencoder

---

## Part II: Specialist Network Architecture

### 2.1 Mixture of Experts Formulation

Given a query $x$, the specialist network routes to one or more experts:

$$y = \sum_{i=1}^{N} g_i(x) \cdot E_i(x)$$

Where:
- $E_i: \mathcal{X} \rightarrow \mathcal{Y}$ is specialist $i$
- $g_i: \mathcal{X} \rightarrow [0,1]$ is the gating weight
- $\sum_{i=1}^{N} g_i(x) = 1$

### 2.2 Two-Stage Routing (Resolves the Chicken-and-Egg Problem)

**The problem:** We want to route based on specialist confidence, but we don't know confidence without running the specialist.

**Solution:** Two-stage routing with a lightweight confidence predictor.

#### Stage 1: Router Predicts Expected Confidence

The router $R$ outputs:
1. Domain probabilities: $\mathbf{p} = (p_1, ..., p_N) \in \Delta^{N-1}$
2. Routing confidence: $c_R \in [0,1]$
3. **Predicted specialist confidences:** $\hat{\mathbf{c}} = (\hat{c}_1, ..., \hat{c}_N)$

$$\begin{aligned}
\mathbf{h}_R &= \text{Encoder}(x) \\
\bar{\mathbf{h}}_R &= \text{MeanPool}(\mathbf{h}_R) \\
\mathbf{p} &= \text{softmax}(\bar{\mathbf{h}}_R W_{\text{domain}}) \\
c_R &= \sigma(\bar{\mathbf{h}}_R W_{\text{conf}}) \\
\hat{c}_i &= \sigma(\bar{\mathbf{h}}_R W_{\text{pred},i}) \quad \forall i \in \{1,...,N\}
\end{aligned}$$

The router is trained to predict what confidence each specialist *would* output:
$$\mathcal{L}_{\text{router-pred}} = \sum_{i=1}^{N} \mathbb{1}[d^* = i] \cdot (c_i^{\text{actual}} - \hat{c}_i)^2$$

#### Stage 2: Select and Run Specialists

**High router confidence** ($c_R > \theta_{\text{high}}$): Run single best specialist
$$i^* = \arg\max_i \hat{c}_i \cdot p_i$$
$$y = E_{i^*}(x)$$

**Medium router confidence** ($\theta_{\text{low}} < c_R \leq \theta_{\text{high}}$): Run top-$K$ specialists
$$\mathcal{K} = \text{top-}K(\hat{c}_i \cdot p_i)$$
Run specialists in parallel: $\{(y_i, c_i, \mathbf{u}_i)\}_{i \in \mathcal{K}}$
Select by **actual** returned confidence:
$$y = y_{\arg\max_{i \in \mathcal{K}} c_i}$$

**Low router confidence** ($c_R \leq \theta_{\text{low}}$): Run all specialists + aggregator
$$y = \text{Aggregator}(\{(y_i, c_i, \mathbf{u}_i)\}_{i=1}^{N})$$

### 2.3 Conflict Detection (Semantic, Not String-Based)

**Problem:** String equality $y_i \neq y_j$ is too brittle for language outputs.

**Solutions:**

#### Option A: Structured Output Agreement
Require specialists to emit structured outputs (e.g., JSON with claims):
```json
{"answer": "...", "claims": ["claim1", "claim2"], "entities": [...]}
```
Conflict = disagreement on claims/entities.

#### Option B: NLI-Based Disagreement
Use an NLI model to check entailment:
$$\text{conflict}(y_i, y_j) = \mathbb{1}[\text{NLI}(y_i, y_j) = \text{CONTRADICT}]$$

#### Option C: Embedding Similarity
$$\text{conflict}(y_i, y_j) = \mathbb{1}[\text{cos}(\text{Embed}(y_i), \text{Embed}(y_j)) < \theta_{\text{sim}}]$$

**Conflict triggers aggregator:**
$$\text{conflict\_detected} = \exists i,j: \text{conflict}(y_i, y_j) \land c_i > \theta \land c_j > \theta$$

### 2.4 Aggregator Model

The aggregator synthesizes multiple specialist outputs:

**Input:** $\{(y_i, c_i, \mathbf{u}_i, d_i)\}_{i=1}^{K}$ where $d_i$ is domain label

**Architecture:**
1. Embed each response with metadata: $\mathbf{e}_i = [\text{Embed}(y_i); c_i; \mathbf{u}_i; \text{Embed}(d_i)]$
2. Cross-attention between response embeddings
3. Generate synthesized output with confidence

**Capabilities:**
- Detect agreement → boost confidence
- Detect conflict → explain disagreement or abstain
- Handle partial information from multiple domains

### 2.5 Training the Network

#### Router Training
$$\mathcal{L}_{\text{router}} = \mathcal{L}_{\text{CE}}(\mathbf{p}, d^*) + \lambda_1 \mathcal{L}_{\text{calib}}(c_R) + \lambda_2 \mathcal{L}_{\text{pred}}(\hat{\mathbf{c}}, \mathbf{c}^{\text{actual}})$$

#### Specialist Training (Independent)
Each specialist on domain-specific data $\mathcal{D}_i$:
$$\mathcal{L}_{E_i} = \mathbb{E}_{(x,y) \sim \mathcal{D}_i}[\mathcal{L}_{\text{total}}(E_i(x), y)]$$

**Plus OOD training:** Include examples from other domains with high $\hat{u}_{\text{ood}}$ targets.

#### End-to-End Fine-tuning (Optional)
$$\mathcal{L}_{\text{e2e}} = \mathcal{L}_{\text{task}}(y^*, y) + \lambda_{\text{route}} \cdot \text{RoutingCost}(x)$$

Where RoutingCost penalizes unnecessary expert calls.

---

## Part III: Calibration Metrics

### 3.1 Expected Calibration Error (ECE)

Partition predictions into $B$ bins by confidence:

$$\text{ECE} = \sum_{b=1}^{B} \frac{n_b}{N} |\text{acc}(b) - \text{conf}(b)|$$

**Target:** ECE < 0.05

### 3.2 Brier Score and Decomposition

$$\text{Brier} = \frac{1}{N}\sum_{i=1}^{N}(c_i - y_i)^2$$

**Murphy decomposition:**
$$\text{Brier} = \underbrace{\frac{1}{N}\sum_b n_b(\text{conf}(b) - \text{acc}(b))^2}_{\text{Reliability (calibration)}} - \underbrace{\frac{1}{N}\sum_b n_b(\text{acc}(b) - \bar{y})^2}_{\text{Resolution (sharpness)}} + \underbrace{\bar{y}(1-\bar{y})}_{\text{Uncertainty (base rate)}}$$

Good models have: low reliability, high resolution.

### 3.3 Selective Prediction Curves

At coverage $\kappa$, predict only on top-$\kappa$ most confident:

$$\text{Acc}@\kappa = \text{accuracy on top-}\kappa\%\text{ by confidence}$$

**Well-calibrated models satisfy:**
$$\kappa_1 < \kappa_2 \implies \text{Acc}@\kappa_1 \geq \text{Acc}@\kappa_2$$

### 3.4 AUROC for OOD Detection

$$\text{AUROC} = P(u_{\text{ood}}(x_{\text{ood}}) > u_{\text{ood}}(x_{\text{in}}))$$

**Target:** AUROC > 0.85

---

## Part IV: Theoretical Properties

### 4.1 Routing Optimality

**Proposition:** Under the following assumptions:
1. Confidences are perfectly calibrated: $c_i(x) = P(\text{correct}_i | x)$
2. Specialists have the same loss function (0-1 error)
3. Specialists have the same abstention policy

Then routing to the highest-confidence specialist minimizes expected error:
$$i^* = \arg\max_i c_i(x) = \arg\min_i P(\text{error}_i | x)$$

**Proof:** By definition of calibration, $c_i(x) = P(\text{correct}_i|x) = 1 - P(\text{error}_i|x)$. Maximizing $c_i$ minimizes $P(\text{error}_i)$. $\square$

**Note:** In practice, calibration is imperfect, so this is an approximation.

### 4.2 Confidence Aggregation (Heuristic Bound)

**Proposition:** For specialists with *approximately independent* correctness events given $x$, confidence aggregation via:

$$c_{\text{agg}} = 1 - \prod_{i \in \mathcal{A}}(1 - c_i)$$

provides an **upper bound** on joint confidence when specialists agree (where $\mathcal{A}$ is the agreeing set).

**Caveat:** Independence rarely holds for same-family models trained on similar data. Treat this as a heuristic, not a guarantee.

### 4.3 OOD Detection (Informal)

**Informal Proposition:** If the embedding space has the property that:
- In-distribution points cluster with margin $\delta$
- OOD points lie outside clusters with high probability

Then a distance-based OOD score achieves AUROC that improves monotonically with $\delta$.

**This is not a formal theorem** — it depends heavily on distributional assumptions and embedding quality.

---

## Part V: Prism Integration

### 5.1 Confidence Operators

| Prism Operator | Mathematical Operation | Design Note |
|----------------|----------------------|-------------|
| `x ~> c` | Attach confidence: $(x, c)$ | |
| `<~x` | Extract confidence: $c$ from $(x, c)$ | |
| `x ~+ y` | $(x + y, \min(c_x, c_y))$ | Conservative "worst-link" |
| `x ~* y` | $(x \cdot y, \min(c_x, c_y))$ | Conservative "worst-link" |
| `x ~\|\| y` | Select $\arg\max_{z \in \{x,y\}} c_z$ | |
| `x ~?? y` | $x$ if $c_x > \theta$ else $y$ | Confidence coalescing |
| `x ~@> t` | $x$ if $c_x > t$ else $\bot$ | Threshold gate |

**Design choice on `~+`, `~*`:** Using $\min(c_x, c_y)$ is conservative — the result is only as confident as the weakest input. Alternative: probabilistic propagation $c_x \cdot c_y$ (assuming independence). We choose conservative for safety; users can override.

### 5.2 Uncertain Control Flow

```
uncertain if (x) {
    high   { ... }  // c_x > θ_high (default 0.8)
    medium { ... }  // θ_low < c_x ≤ θ_high
    low    { ... }  // c_x ≤ θ_low (default 0.5)
}
```

Thresholds are configurable per-application.

### 5.3 Parallax Agent Protocol

```protobuf
message AgentResponse {
    bytes value = 1;
    float confidence = 2;           // c_overall
    float epistemic_uncertainty = 3; // u_ep (higher = worse)
    float aleatoric_uncertainty = 4; // u_al (higher = worse)
    float distribution_shift = 5;    // u_ood (higher = worse)
    string primary_uncertainty_type = 6;
}
```

---

## Part VI: Implementation Notes

### 6.1 Hyperparameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| $\lambda_{\text{calib}}$ | 0.3 | Calibration loss weight |
| $\lambda_{\text{unc}}$ | 0.1 | Uncertainty channel loss weight |
| $\lambda_{\text{sharp}}$ | 0.05 | Sharpness loss weight |
| $\theta_{\text{high}}$ | 0.8 | High confidence threshold |
| $\theta_{\text{low}}$ | 0.5 | Low confidence threshold |
| $\alpha, \beta, \gamma$ | Learned | Uncertainty mixing coefficients |
| ECE bins $B$ | 15 | Calibration evaluation bins |

### 6.2 Avoiding Common Pitfalls

| Pitfall | Symptom | Solution |
|---------|---------|----------|
| Confidence collapse | All predictions ~0.5 | Add sharpness loss |
| Overconfidence | High conf on wrong answers | Increase $\lambda_{\text{calib}}$ |
| Uncertainty correlation | All $u_k$ move together | Add decorrelation regularizer |
| OOD false positives | Novel but valid inputs flagged | Expand training distribution |

### 6.3 Evaluation Checklist

- [ ] ECE < 0.05 (calibration)
- [ ] Reliability diagram is diagonal
- [ ] Selective prediction curve is monotonic
- [ ] AUROC > 0.85 for OOD detection
- [ ] Uncertainties are not perfectly correlated
- [ ] No confident wrong answers on held-out test

---

## Appendix A: Notation Summary

| Symbol | Meaning |
|--------|---------|
| $x$ | Input sequence |
| $y$ | Target/output |
| $c$ | Confidence (higher = better) |
| $u$ | Uncertainty (higher = worse) |
| $\theta$ | Model parameters |
| $\mathcal{D}$ | Training data |
| $E_i$ | Specialist $i$ |
| $R$ | Router |
| $A$ | Aggregator |

---

## References

1. Guo et al. (2017) "On Calibration of Modern Neural Networks"
2. Lakshminarayanan et al. (2017) "Simple and Scalable Predictive Uncertainty Estimation using Deep Ensembles"
3. Shazeer et al. (2017) "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer"
4. Hendrycks & Gimpel (2017) "A Baseline for Detecting Misclassified and Out-of-Distribution Examples"
5. Depeweg et al. (2018) "Decomposition of Uncertainty in Bayesian Deep Learning"
6. Malinin & Gales (2018) "Predictive Uncertainty Estimation via Prior Networks"
