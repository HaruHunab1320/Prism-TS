# Lumina Training Plan

## Overview

Train a uncertainty-aware language model that:
1. Matches or exceeds GPT-2 on standard benchmarks
2. Demonstrates best-in-class calibration (knows what it doesn't know)
3. Excels at Prism code generation

**Target Hardware:** 8x H100 on GCP
**Estimated Total Time:** ~25 hours
**Estimated Cost:** ~$625

---

## Training Phases

### Phase 1: Foundation Pre-training
**Goal:** Competitive general language model
**Duration:** ~12-16 hours on 8x H100

| Dataset | Samples | Purpose |
|---------|---------|---------|
| The Pile (subset) | 10M | Diverse, high-quality web text |
| GitHub Code (JS/TS/Python) | 5M | Code understanding, syntax similar to Prism |
| Wikipedia | 2M | Factual knowledge |
| **Total** | **17M samples** | |

**Expected Outcome:**
- LAMBADA accuracy: 35-45% (vs GPT-2's 42%)
- HellaSwag: 35-45%
- Perplexity competitive with GPT-2

### Phase 2: Uncertainty-Aware Fine-tuning
**Goal:** Best-in-class calibration, unique differentiation
**Duration:** ~4-6 hours on 8x H100

| Dataset | Samples | Purpose |
|---------|---------|---------|
| Scientific Papers (arXiv abstracts) | 500K | Uncertainty language patterns |
| ConfidenceQA (synthetic) | 100K | Explicit confidence training |
| Weather/Probabilistic Data | 100K | Probabilistic reasoning |
| Code Reviews + Uncertainty | 200K | Code confidence patterns |
| Fact-Checked Content | 100K | Accuracy-labeled data |
| **Total** | **1M samples** | |

**Expected Outcome:**
- ECE (calibration error): < 0.05 (currently 0.086)
- AUROC uncertainty: > 0.85 (currently 0.77)
- Selective accuracy improvement: > 50%

### Phase 3: Prism Specialization
**Goal:** Excellent Prism code generation
**Duration:** ~2-3 hours on 8x H100

| Dataset | Samples | Purpose |
|---------|---------|---------|
| Prism Examples (from repos) | 5K | Real Prism patterns |
| Synthetic Prism Code | 50K | Generated examples |
| Prism Documentation | 1K | Language reference |
| Prism Q&A Pairs | 10K | Instruction following |
| **Total** | **66K samples** | |

**Expected Outcome:**
- Generates valid Prism syntax
- Understands confidence operators (~>, <~, ~+, etc.)
- Handles uncertain if/high/medium/low patterns
- Integrates LLM calls appropriately

---

## Dataset Sources

### Phase 1 Datasets

#### The Pile
- **Source:** https://pile.eleuther.ai/
- **License:** MIT
- **Format:** JSONL
- **Notes:** Use subset - focus on high-quality components (Wikipedia, Books, GitHub, StackExchange)

#### GitHub Code
- **Source:** The Stack (HuggingFace) or GitHub Archive
- **License:** Various (filter for permissive)
- **Languages:** JavaScript, TypeScript, Python
- **Notes:** These are syntactically closest to Prism

#### Wikipedia
- **Source:** Wikimedia dumps or HuggingFace datasets
- **License:** CC BY-SA
- **Format:** Plain text articles

### Phase 2 Datasets

#### arXiv Abstracts
- **Source:** Kaggle arXiv dataset or arXiv API
- **License:** Various (abstracts are generally fair use)
- **Notes:** Rich in uncertainty language ("we hypothesize", "results suggest", "p < 0.05")

#### ConfidenceQA (CREATE)
- **Source:** Synthetic generation
- **Format:**
```json
{
  "question": "What is the capital of France?",
  "answer": "Paris",
  "confidence": 0.99,
  "explanation": "Well-established fact"
}
```
- **Categories:**
  - Factual (high confidence)
  - Probabilistic (medium confidence)
  - Speculative (low confidence)
  - Unknowable (very low confidence)

#### Weather/Probabilistic
- **Source:** NOAA historical forecasts, prediction markets
- **Format:** Predictions with probability scores
- **Notes:** Teaches probabilistic reasoning

#### Code Reviews
- **Source:** GitHub PR comments, code review datasets
- **Notes:** Contains uncertainty markers ("might break", "not sure if", "TODO")

### Phase 3 Datasets

#### Prism Examples (CURATE)
- **Source:** Prism-TS monorepo
- **Location:** `/packages/prism-examples/`
- **Status:** Partially complete

#### Synthetic Prism (GENERATE)
- **Method:** Template-based + LLM-assisted generation
- **Coverage needed:**
  - All operators (~>, <~, ~+, ~-, ~*, ~/, etc.)
  - All control flow (uncertain if, high/medium/low)
  - Module patterns (import/export)
  - Async patterns
  - LLM integration patterns

#### Prism Documentation
- **Source:** `/apps/docs/`
- **Format:** Markdown → training examples

---

## Data Preparation Pipeline

```
1. Download/collect raw datasets
2. Filter for quality and license compliance
3. Tokenize with consistent tokenizer (GPT-2 tokenizer)
4. Create train/validation splits
5. Format as streaming dataset for distributed training
6. Upload to GCS bucket
```

---

## Model Architecture

**Base:** Lumina (190M parameters)
- 12 transformer layers
- 768 hidden dimension
- 12 attention heads
- Confidence head per layer

**For H100 Training:**
- Port from MLX → PyTorch
- Enable Flash Attention 2
- Use bfloat16 mixed precision
- DeepSpeed ZeRO-2 for multi-GPU

---

## Training Configuration

### Phase 1
```yaml
batch_size: 256 (32 per GPU × 8 GPUs)
learning_rate: 3e-4
warmup_steps: 2000
weight_decay: 0.1
max_length: 1024
gradient_accumulation: 4
```

### Phase 2
```yaml
batch_size: 128
learning_rate: 1e-4  # Lower for fine-tuning
warmup_steps: 500
confidence_weight: 0.2  # Increase confidence loss weight
```

### Phase 3
```yaml
batch_size: 64
learning_rate: 5e-5  # Even lower for specialization
epochs: 5
```

---

## Evaluation Checkpoints

### After Phase 1
- [ ] LAMBADA accuracy > 35%
- [ ] HellaSwag > 35%
- [ ] Perplexity < 30

### After Phase 2
- [ ] ECE < 0.05
- [ ] AUROC uncertainty > 0.85
- [ ] Selective accuracy @ 50%: > 50%

### After Phase 3
- [ ] Generates valid Prism syntax > 95%
- [ ] Correct operator usage > 90%
- [ ] Meaningful confidence values in generated code

---

## Deliverables

1. **Trained Model Weights** - Lumina-190M-v1
2. **Evaluation Report** - Benchmarks vs GPT-2
3. **Demo Application** - Interactive confidence-aware generation
4. **Blog Post** - "Building an LLM that knows what it doesn't know"
5. **Prism Integration** - Model integrated into Parallax platform

---

## Timeline

| Day | Task |
|-----|------|
| 1 | Port to PyTorch, prepare datasets |
| 2 | Upload to GCS, test training setup |
| 3 | Phase 1 training (16 hrs) |
| 4 | Phase 2 training (6 hrs) + Phase 3 (3 hrs) |
| 5 | Evaluation, write-up, demos |

---

## Open Questions

1. Should we use The Pile or a custom mixture?
2. How much synthetic Prism data is enough?
3. Should we release the model openly or keep proprietary?
4. What's the marketing/launch strategy?
