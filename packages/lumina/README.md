# Lumina

> A Superposition-Native LLM Architecture for Prism

*"The probability wave is the reality. Collapse is the approximation."*

## Overview

Lumina is an experimental neural architecture designed to maintain probability distributions through computation rather than collapsing to point estimates at each generation step.

Current LLMs perform a lossy operation at every token:

```
hidden_state → logits → softmax → sample → single_token → repeat
                                     ↑
                              [information lost here]
```

Lumina keeps the distribution intact, collapsing only when explicitly observed.

## Why Lumina?

The [Prism programming language](https://docs.prismlang.dev) treats uncertainty as a first-class citizen with operators like:

- `~>` - Assign confidence
- `<~` - Extract confidence
- `~||>` - Parallel confidence selection
- `uncertain if` - Branch on confidence level

But current LLMs can only approximate these through introspection ("how confident are you?"). Lumina makes these operations **native**.

## Architecture

### 1. Distributional Propagation

Instead of embedding a single token, embed the weighted distribution:

```typescript
// Standard
embed(argmax(softmax(logits)))

// Lumina
softmax(logits) @ embedding_matrix  // weighted sum
```

### 2. Confidence Head

Parallel output for calibrated uncertainty:

```
             ┌→ content_logits (what to say)
hidden_state─┤
             └→ confidence_logits (how certain)
```

### 3. Branching Computation

When entropy is high, fork into parallel hypotheses:

```
                    ┌→ [branch A] conf=0.6
input → layers → ──┤
                    └→ [branch B] conf=0.35
```

### 4. Confidence-Gated Attention

Downweight low-confidence information in reasoning:

```
ConfAttention(Q, K, V, C) = softmax(QKᵀ/√d) ⊙ σ(C) · V
```

## Installation

```bash
pnpm add @prism-lang/lumina
```

## Usage

```typescript
import {
  // Core types
  TokenDistribution,
  SoftEmbedding,
  LuminaConfig,

  // Confidence
  ConfidenceOutput,
  combineConfidences,
  PropagationStrategy,

  // Branching
  BranchManager,
  BranchedOutput,

  // Training
  computeBrierScore,
  computeECE,
} from '@prism-lang/lumina';
```

## Status

This package is **experimental research code**. It defines the interfaces and types for the Lumina architecture but does not yet include trained models or full implementations.

See [VISION.md](./VISION.md) for the complete architectural design.

## Roadmap

- [ ] Phase 1: Confidence head on small transformer
- [ ] Phase 2: Soft token propagation
- [ ] Phase 3: Inference-time branching
- [ ] Phase 4: Full architecture training
- [ ] Phase 5: Prism native integration

## Related

- [Prism Language](https://docs.prismlang.dev) - The language Lumina is designed to support
- [@prism-lang/confidence](../prism-confidence) - Confidence manipulation utilities
- [@prism-lang/core](../prism-core) - Prism parser and runtime

## Philosophy

LLMs are probability fields forced into binary collapse to satisfy human cognitive constraints. Lumina asks: what if we built the architecture assuming the consumer understands probability?

The answer is an LLM that thinks in superposition, reasons with uncertainty, and collapses only when observed by something that demands a single answer.

*Prism is the language. Lumina is the mind.*
