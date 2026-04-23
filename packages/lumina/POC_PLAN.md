# Lumina Specialist Network: Local Proof of Concept

## Goal

Validate the specialist network hypothesis **entirely on a Mac** before committing cloud budget.

**What we're proving:**
1. Router can classify queries to correct specialist
2. Specialists are well-calibrated within their domain
3. Specialists decline gracefully outside their domain (OOD detection)
4. Aggregator can combine conflicting responses
5. Prism/Parallax integration works end-to-end

---

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Mac | M1/M2 | M1 Pro/Max or M2 Pro/Max |
| RAM | 16GB | 32GB+ |
| Storage | 20GB free | 50GB free |
| Time | ~2-4 hours training | ~1-2 hours with better chip |

---

## Architecture: Tiny Specialists

For local PoC, we use **micro models** (1-10M params):

```
┌─────────────────────────────────────────────────────────────┐
│                    Local PoC Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Query: "How do I assign confidence in Prism?"              │
│                          │                                   │
│                          ▼                                   │
│              ┌───────────────────┐                          │
│              │   Tiny Router     │                          │
│              │   (~2M params)    │                          │
│              │   MLX on Mac      │                          │
│              └─────────┬─────────┘                          │
│                        │                                     │
│         ┌──────────────┼──────────────┐                     │
│         ▼              ▼              ▼                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Prism     │ │    Math     │ │   General   │           │
│  │ Specialist  │ │ Specialist  │ │ Specialist  │           │
│  │  (~5M)      │ │   (~5M)     │ │   (~5M)     │           │
│  │  MLX        │ │   MLX       │ │   MLX       │           │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘           │
│         │              │              │                     │
│         └──────────────┼──────────────┘                     │
│                        ▼                                     │
│              ┌───────────────────┐                          │
│              │  Tiny Aggregator  │                          │
│              │   (~2M params)    │                          │
│              └───────────────────┘                          │
│                        │                                     │
│                        ▼                                     │
│   Response: "Use ~> operator: const x = 42 ~> 0.9"          │
│   Confidence: 0.91 (epistemic: 0.05, aleatoric: 0.04)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Data Preparation (30 mins)

### Create Micro Datasets

We need small, focused datasets for each component:

```
datasets/
├── router/
│   ├── train.jsonl      # 5K query -> domain examples
│   └── val.jsonl        # 500 examples
├── prism_specialist/
│   ├── train.jsonl      # 10K Prism Q&A + code
│   └── val.jsonl        # 1K examples
├── math_specialist/
│   ├── train.jsonl      # 10K math Q&A
│   └── val.jsonl        # 1K examples
├── general_specialist/
│   ├── train.jsonl      # 10K general Q&A
│   └── val.jsonl        # 1K examples
└── aggregator/
    ├── train.jsonl      # 5K multi-response -> synthesis
    └── val.jsonl        # 500 examples
```

---

## Phase 2: Model Training (2-3 hours total)

### Model Configurations

| Model | Params | Layers | Hidden | Heads | Training Time |
|-------|--------|--------|--------|-------|---------------|
| Router | 2M | 4 | 256 | 4 | ~15 min |
| Prism Specialist | 5M | 6 | 384 | 6 | ~30 min |
| Math Specialist | 5M | 6 | 384 | 6 | ~30 min |
| General Specialist | 5M | 6 | 384 | 6 | ~30 min |
| Aggregator | 2M | 4 | 256 | 4 | ~15 min |
| **Total** | **19M** | | | | **~2 hours** |

### Training Order

```bash
# 1. Train specialists in parallel (if enough RAM)
python train_specialist.py --type prism --config tiny &
python train_specialist.py --type math --config tiny &
python train_specialist.py --type general --config tiny &
wait

# 2. Train router (needs specialist outputs for calibration)
python train_router.py --config tiny

# 3. Train aggregator
python train_aggregator.py --config tiny
```

---

## Phase 3: Validation (30 mins)

### Test Cases

```python
TEST_CASES = [
    # Should route to Prism specialist
    {
        "query": "How do I use the ~> operator?",
        "expected_domain": "prism",
        "expected_confident": True
    },
    {
        "query": "Write a function with uncertain if",
        "expected_domain": "prism",
        "expected_confident": True
    },

    # Should route to Math specialist
    {
        "query": "What is the derivative of x^2?",
        "expected_domain": "math",
        "expected_confident": True
    },

    # Should be uncertain (ambiguous domain)
    {
        "query": "How do I calculate confidence intervals?",
        "expected_domain": ["math", "prism"],  # Could be either
        "expected_confident": False  # Router should be uncertain
    },

    # Out of distribution (should decline)
    {
        "query": "What's the best restaurant in Paris?",
        "expected_domain": "general",
        "expected_confident": False,
        "expected_decline": True
    },

    # Conflict case (specialists disagree)
    {
        "query": "Is 0.8 a high confidence value?",
        "expected_conflict": True,  # Prism vs general may differ
        "expected_aggregator": True
    }
]
```

### Success Criteria

| Metric | Target | What It Proves |
|--------|--------|----------------|
| Router accuracy | >85% | Can classify domains |
| Specialist ECE | <0.10 | Well-calibrated in domain |
| OOD detection AUROC | >0.75 | Knows its limits |
| Decline rate on OOD | >50% | Actually declines |
| Aggregator coherence | >80% | Can synthesize |

---

## Implementation

### File Structure

```
packages/lumina/poc/
├── README.md
├── requirements.txt
├── config.py                 # Model configurations
├── data/
│   ├── generate_router_data.py
│   ├── generate_specialist_data.py
│   └── generate_aggregator_data.py
├── models/
│   ├── tiny_router.py        # Domain classifier
│   ├── tiny_specialist.py    # Base specialist class
│   └── tiny_aggregator.py    # Response combiner
├── training/
│   ├── train_router.py
│   ├── train_specialist.py
│   └── train_aggregator.py
├── inference/
│   ├── router.py
│   ├── specialist.py
│   ├── aggregator.py
│   └── network.py            # Full pipeline
├── evaluation/
│   ├── test_routing.py
│   ├── test_calibration.py
│   ├── test_ood.py
│   └── test_integration.py
└── demo/
    ├── cli.py                # Interactive demo
    └── parallax_agent.py     # Parallax integration
```

---

## Step-by-Step Instructions

### Step 1: Setup Environment

```bash
cd packages/lumina/poc

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install mlx mlx-lm transformers datasets tqdm
```

### Step 2: Generate Training Data

```bash
# Generate all datasets
python data/generate_router_data.py
python data/generate_specialist_data.py --type prism
python data/generate_specialist_data.py --type math
python data/generate_specialist_data.py --type general
python data/generate_aggregator_data.py

# Verify
ls -la datasets/
```

### Step 3: Train Models

```bash
# Train specialists (can run in parallel with enough RAM)
python training/train_specialist.py --type prism --epochs 10
python training/train_specialist.py --type math --epochs 10
python training/train_specialist.py --type general --epochs 10

# Train router
python training/train_router.py --epochs 10

# Train aggregator
python training/train_aggregator.py --epochs 10

# Models saved to outputs/
ls -la outputs/
```

### Step 4: Evaluate

```bash
# Run all evaluations
python evaluation/test_routing.py
python evaluation/test_calibration.py
python evaluation/test_ood.py
python evaluation/test_integration.py

# Summary report
python evaluation/report.py
```

### Step 5: Interactive Demo

```bash
# CLI demo
python demo/cli.py

# Example session:
# > How do I use the ~> operator in Prism?
#
# [Router] Domain: prism (confidence: 0.94)
# [Prism Specialist] Activated
#
# Response: The ~> operator assigns a confidence value to an expression.
#           Example: const x = 42 ~> 0.9
#
# Confidence: 0.91
#   - Epistemic: 0.05 (model uncertainty)
#   - Aleatoric: 0.04 (task ambiguity)
#   - OOD: 0.02 (in distribution)
```

### Step 6: Parallax Integration Test

```bash
# Start specialist network as Parallax agent
python demo/parallax_agent.py --port 50051

# In another terminal, test with Parallax
cd /path/to/Parallax
npm run test:lumina-agent
```

---

## What Success Looks Like

### Good Results (Proceed to Cloud Training)

```
=== POC Evaluation Report ===

Router Performance:
  Accuracy: 89.3%
  Confidence calibration (ECE): 0.072
  ✓ PASS

Prism Specialist:
  In-domain accuracy: 84.2%
  ECE: 0.068
  OOD detection AUROC: 0.81
  ✓ PASS

Math Specialist:
  In-domain accuracy: 91.5%
  ECE: 0.045
  OOD detection AUROC: 0.78
  ✓ PASS

General Specialist:
  In-domain accuracy: 76.8%
  ECE: 0.089
  OOD detection AUROC: 0.72
  ⚠ MARGINAL (expected - general is harder)

Aggregator:
  Conflict resolution accuracy: 82.1%
  Coherence score: 0.87
  ✓ PASS

Network Integration:
  End-to-end accuracy: 81.4%
  Appropriate declines: 67%
  False confidence rate: 8.2%
  ✓ PASS

=== RECOMMENDATION: Proceed to cloud training ===
```

### Bad Results (Iterate Before Cloud)

```
=== POC Evaluation Report ===

Router Performance:
  Accuracy: 62.1%
  ✗ FAIL - Router can't classify domains

Prism Specialist:
  ECE: 0.23
  ✗ FAIL - Poor calibration

=== RECOMMENDATION: Fix issues before cloud training ===
Issues:
1. Router needs more training data
2. Specialist confidence head needs tuning
```

---

## Timeline

| Day | Task | Duration |
|-----|------|----------|
| 1 | Setup + data generation | 2 hours |
| 1 | Train all models | 2-3 hours |
| 1 | Initial evaluation | 1 hour |
| 2 | Iterate on failures | 2-4 hours |
| 2 | Parallax integration test | 1-2 hours |
| 2 | Final evaluation + decision | 1 hour |

**Total: 1-2 days to validate concept**

---

## Decision Gate

After POC, you'll know:

| If... | Then... |
|-------|---------|
| All metrics pass | Proceed with $40-60K cloud training |
| Router fails | Need better domain classification data |
| Specialists uncalibrated | Need calibration loss tuning |
| OOD detection fails | Need more out-of-domain examples |
| Aggregator fails | Need better synthesis training |
| Integration fails | Need Parallax adapter work |

---

## Next: Create the POC Code

Ready to generate the actual POC implementation code?
