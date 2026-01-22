# Lumina: A Superposition-Native LLM Architecture

> *"The probability wave is the reality. Collapse is the approximation."*

## The Problem

Current LLM architectures perform a fundamental lossy operation at every generation step:

```
hidden_state → logits → softmax → sample → single_token → repeat
                                     ↑
                              [collapse happens here]
```

Everything *before* the sample is a rich probability field. The architecture then **discards the distribution** and conditions the next step on a point estimate. This design choice:

1. **Satisfies human expectations** of deterministic, readable output
2. **Destroys information** that could inform downstream reasoning
3. **Forces post-hoc uncertainty estimation** (asking "how confident are you?")
4. **Prevents native superposition** of multiple reasoning paths

The Prism programming language treats uncertainty as a first-class citizen, but current LLMs can only approximate this through introspection hacks. Lumina is the architecture that makes Prism's operators *native*.

---

## Core Thesis

**LLMs are probability fields forced into binary collapse to satisfy human cognitive constraints. A new architecture should maintain superposition through computation and collapse only at explicit observation points.**

This mirrors quantum mechanics: the wave function evolves unitarily until measurement. Lumina applies this principle to neural language models.

---

## Architectural Components

### 1. Distributional Propagation

Instead of sampling a token and feeding it back as a hard embedding, Lumina propagates the full distribution:

```
Standard:     embed(argmax(softmax(logits)))
Lumina:       softmax(logits) @ embedding_matrix  // weighted sum of all token embeddings
```

The "soft embedding" is:
```
e_soft = Σᵢ p(tokenᵢ) · embed(tokenᵢ)
```

This weighted superposition propagates forward. The distribution *is* the representation.

**Key insight**: You don't need to enumerate all tokens. The distribution can be approximated by its top-k components or represented in a compressed basis.

#### Implementation Sketch

```typescript
interface SoftEmbedding {
  // The weighted embedding vector
  vector: Float32Array;

  // The underlying distribution (sparse: only non-negligible probabilities)
  distribution: Map<TokenId, Probability>;

  // Entropy of the distribution (measure of uncertainty)
  entropy: number;
}

class DistributionalEmbeddingLayer {
  // Instead of lookup(tokenId), we have:
  forward(distribution: TokenDistribution): SoftEmbedding {
    // Compute weighted sum of embeddings
    // Track entropy for confidence propagation
  }
}
```

### 2. Explicit Confidence Head

Current models encode uncertainty implicitly in logit entropy, but this signal is:
- Poorly calibrated
- Not separately trainable
- Conflates different types of uncertainty

Lumina adds a parallel confidence output:

```
                 ┌→ content_logits (what to say)
hidden_state ────┤
                 └→ confidence_logits (calibrated certainty)
```

The confidence head is trained with proper scoring rules:
- **Brier Score**: (confidence - correctness)²
- **Expected Calibration Error**: |accuracy - confidence| across bins
- **Negative Log Likelihood** on confidence predictions

#### Uncertainty Types

The confidence head learns to distinguish:

| Type | Meaning | Example |
|------|---------|---------|
| **Epistemic** | Model doesn't know | "What did X say in private?" |
| **Aleatoric** | Inherently ambiguous | "Will this coin flip heads?" |
| **Out-of-distribution** | Input unlike training | Jargon, new concepts |
| **High confidence** | Model is calibrated certain | Well-established facts |

```typescript
interface ConfidenceOutput {
  overall: number;           // 0-1 calibrated confidence
  epistemic: number;         // Uncertainty from lack of knowledge
  aleatoric: number;         // Inherent ambiguity in the query
  distribution_shift: number; // How OOD is this input?
}
```

### 3. Branching Computation

When uncertainty exceeds a threshold, computation **forks**:

```
                        ┌→ [branch A: hypothesis 1] conf=0.6
input → layers → fork ──┤
                        └→ [branch B: hypothesis 2] conf=0.35
```

Each branch continues independently with its own:
- Hidden states
- Accumulated confidence
- Generation buffer

Branches can:
- **Merge**: When they converge to equivalent conclusions
- **Prune**: When confidence drops below threshold
- **Propagate**: Continue as parallel hypotheses
- **Escalate**: Output both for human decision (maps to Prism's `uncertain if`)

#### Fork Decision Function

```typescript
interface ForkDecision {
  shouldFork(state: HiddenState, entropy: number): boolean;

  // When to fork: entropy above threshold, or explicit uncertainty markers
  entropyThreshold: number;

  // Maximum active branches (memory constraint)
  maxBranches: number;

  // Minimum confidence to keep a branch alive
  pruneThreshold: number;
}
```

### 4. Confidence-Gated Attention

Standard attention:
```
Attention(Q, K, V) = softmax(QKᵀ / √d) · V
```

Confidence-aware attention:
```
ConfAttention(Q, K, V, C) = softmax(QKᵀ / √d) ⊙ σ(C) · V
```

Where `C` is the confidence vector for each key position, and `⊙` is element-wise multiplication.

**Effect**: Low-confidence information is downweighted in reasoning. The model learns to "trust" certain parts of context more than others.

```typescript
interface ConfidenceGatedAttention {
  forward(
    query: Tensor,
    key: Tensor,
    value: Tensor,
    keyConfidence: Tensor  // Per-position confidence scores
  ): { output: Tensor; attentionWeights: Tensor };
}
```

### 5. Multi-Resolution Output

Instead of token-by-token generation at a single level:

```
Layer N:     [abstract intent]       confidence: 0.92
Layer N-k:   [semantic structure]    confidence: 0.78
Layer 0:     [specific tokens]       confidence: 0.65
```

Higher layers capture *meaning*, lower layers capture *expression*. Confidence can differ:
- High intent confidence + low phrasing confidence = "I know what to say but not how"
- Low intent confidence + any phrasing confidence = "I'm uncertain about the answer"

This maps naturally to Prism's confidence propagation through computation.

---

## Training Objectives

### Primary Losses

1. **Language Modeling Loss** (standard)
   ```
   L_lm = -log P(token_t | context)
   ```

2. **Confidence Calibration Loss**
   ```
   L_cal = Σᵢ (confidenceᵢ - correctᵢ)²
   ```

3. **Entropy Regularization** (prevent overconfident collapse)
   ```
   L_ent = -λ · H(distribution)
   ```

4. **Branch Consistency Loss** (parallel branches should agree when they converge)
   ```
   L_branch = KL(branch_a || branch_b) when conclusions match
   ```

### Training Strategy

**Phase 1**: Standard pretraining with soft targets
- Use label smoothing extensively
- Train confidence head from start

**Phase 2**: Calibration fine-tuning
- Curated dataset with known uncertainty levels
- Explicit "I don't know" examples
- Adversarial confidence attacks

**Phase 3**: Branching training
- Start with 2 branches
- Gradually increase branch complexity
- Reward accurate uncertainty-based forking

---

## Inference Modes

### Mode 1: Collapsed (Standard)
For human interfaces that need single outputs:
```
output = argmax(final_distribution)
confidence = confidence_head(final_state)
```

### Mode 2: Distribution
For Prism integration:
```typescript
interface DistributionalOutput {
  tokens: TokenId[];           // Most likely sequence
  distribution: Distribution;   // Full probability field
  confidence: ConfidenceOutput;
  branches?: BranchOutput[];   // If branching was triggered
}
```

### Mode 3: Branched
For complex reasoning with explicit uncertainty:
```typescript
interface BranchedOutput {
  branches: Array<{
    content: string;
    confidence: number;
    reasoning_trace: string[];
  }>;

  // Recommendation for how to resolve
  resolution: 'highest_confidence' | 'human_review' | 'ensemble';
}
```

---

## Prism Integration

With Lumina, Prism's operators become direct API calls:

| Prism Operator | Current (Hack) | Lumina (Native) |
|----------------|----------------|-----------------|
| `value ~> conf` | Ask LLM to introspect | Read confidence head |
| `<~ value` | Parse introspection | Extract from output |
| `a ~\|\|> b` | Multiple API calls | Single call, branch selection |
| `uncertain if` | Post-hoc threshold | Architecture forks automatically |
| `~+`, `~*` | Manual propagation | Learned in soft embeddings |

### Native Prism Types

```typescript
// Lumina output maps directly to Prism's ConfidenceValue
interface LuminaOutput {
  value: any;
  confidence: number;

  // Additional metadata for advanced operators
  entropy: number;
  branches?: LuminaOutput[];
}

// The llm() builtin returns this natively
function llm(prompt: string): LuminaOutput {
  const result = lumina.generate(prompt, { mode: 'distribution' });
  return {
    value: result.text,
    confidence: result.confidence.overall,
    entropy: result.entropy,
    branches: result.branches
  };
}
```

---

## Research Directions

### Near-term (Buildable Now)

1. **Confidence Head on Existing Models**
   - Add and train a confidence head on GPT-2 or similar
   - Validate calibration improvements
   - Benchmark against logit-entropy baselines

2. **Soft Token Training**
   - Modify training to use soft targets
   - Measure impact on calibration and sample efficiency

3. **Inference-Time Branching**
   - Implement branch-on-entropy at inference
   - No architecture changes, just inference algorithm

### Medium-term (Architecture Changes)

4. **Distributional Propagation Layer**
   - Replace hard embeddings with soft propagation
   - Train end-to-end with distribution preservation

5. **Confidence-Gated Attention**
   - Modify attention mechanism to incorporate confidence
   - Train with confidence-aware objectives

### Long-term (Novel Architecture)

6. **Full Lumina Architecture**
   - Integrate all components
   - Train from scratch at scale
   - Benchmark against standard transformers

7. **Prism-Native Inference Server**
   - Serving infrastructure that returns distributions
   - Native integration with Prism runtime

---

## Implementation Roadmap

### Phase 1: Proof of Concept
- [ ] Implement confidence head on small transformer
- [ ] Create calibration benchmark dataset
- [ ] Validate calibration improvements over baseline
- [ ] Document findings

### Phase 2: Soft Propagation
- [ ] Implement SoftEmbedding layer
- [ ] Train with distribution preservation
- [ ] Measure information retention vs standard
- [ ] Integrate with Prism runtime

### Phase 3: Branching
- [ ] Implement ForkDecision logic
- [ ] Add branch management (merge/prune)
- [ ] Train branching policy
- [ ] Map to Prism's uncertain control flow

### Phase 4: Full Integration
- [ ] Complete Lumina architecture
- [ ] Scale training
- [ ] Prism SDK with native Lumina types
- [ ] Production inference server

---

## Philosophical Note

Current LLMs are probability fields collapsed into deterministic outputs to satisfy human binary thinking. But humans aren't the only consumers anymore—AI systems consume AI outputs.

When an LLM's output feeds into another system (Prism, an agent, a pipeline), the collapse is premature. The downstream system could have used the uncertainty.

Lumina asks: **What if we built the architecture assuming the consumer understands probability?**

The answer is an LLM that thinks in superposition, reasons with uncertainty, and collapses only when observed by something that demands a single answer.

*Prism is the language. Lumina is the mind.*

---

## References & Related Work

- Bayesian Deep Learning (Gal & Ghahramani)
- Mixture of Experts (Shazeer et al.)
- Conformal Prediction for Neural Networks
- Calibration in Modern Neural Networks (Guo et al.)
- Probabilistic Programming Languages (Stan, Pyro, etc.)

---

## Contributing

This is exploratory research. Contributions welcome in:
- Architecture refinements
- Training methodology
- Benchmark creation
- Prism integration
- Theoretical foundations

*"The wave function is more real than the particle."*
