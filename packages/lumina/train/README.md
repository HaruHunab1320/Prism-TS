# Lumina Training

Training infrastructure for Lumina - a superposition-native LLM architecture.

This package trains transformers with confidence heads using MLX on Apple Silicon.

## Quick Start

### 1. Install Dependencies

```bash
cd packages/lumina/train
pip install -e ".[dev,viz]"
```

### 2. Train a Tiny Model (Fast Test)

```bash
python -m lumina_train.train --config tiny --epochs 3 --debug
```

This trains a ~2M parameter model for quick iteration. On M1/M2, this takes a few minutes.

### 3. Train a Small Model (Recommended for Phase 1)

```bash
python -m lumina_train.train \
    --config small \
    --epochs 10 \
    --batch-size 8 \
    --max-length 256 \
    --brier-weight 0.1
```

This trains a ~25M parameter model. On M1/M2 Pro/Max with 32GB, expect:
- ~2-3 hours for 10 epochs on WikiText-2
- Good enough to validate confidence calibration

### 4. Evaluate

```bash
python -m lumina_train.evaluate \
    --checkpoint outputs/lumina-small-xxx/checkpoint-1000
```

## Model Configurations

| Config | Params | Hidden | Layers | Heads | Use Case |
|--------|--------|--------|--------|-------|----------|
| `tiny` | ~2M | 128 | 4 | 4 | Debugging, fast iteration |
| `small` | ~25M | 256 | 6 | 8 | Phase 1 experiments |
| `base` | ~125M | 768 | 12 | 12 | GPT-2 small equivalent |
| `medium` | ~355M | 1024 | 24 | 16 | GPT-2 medium equivalent |

## Loss Functions

The training uses multiple losses:

1. **Language Modeling Loss** (weight: 1.0)
   - Standard cross-entropy with label smoothing

2. **Brier Score** (weight: 0.1)
   - Calibration loss: `(confidence - correctness)²`
   - Encourages confidence to match actual accuracy

3. **Focal Loss** (weight: 0.05)
   - Focuses learning on hard examples
   - Helps with overconfident predictions

4. **Entropy Regularization** (weight: 0.01)
   - Prevents overconfident collapse
   - Maintains healthy uncertainty

## Training Tips

### For M1/M2 (8-16GB)
```bash
python -m lumina_train.train \
    --config tiny \
    --batch-size 4 \
    --max-length 128
```

### For M1/M2 Pro/Max (32GB+)
```bash
python -m lumina_train.train \
    --config small \
    --batch-size 8 \
    --max-length 256
```

### For M3 Max/Ultra (64GB+)
```bash
python -m lumina_train.train \
    --config base \
    --batch-size 16 \
    --max-length 512
```

## Calibration Evaluation

The evaluation script measures:

- **ECE** (Expected Calibration Error): Lower is better
- **MCE** (Maximum Calibration Error): Worst-case miscalibration
- **Brier Score**: Proper scoring rule for probability forecasts
- **Calibration Gap**: |accuracy - avg_confidence|

A well-calibrated model should have:
- ECE < 0.05
- Calibration Gap < 0.05
- Confidence that increases for factual questions and decreases for unknowable questions

## Architecture

```
LuminaModel
├── token_embedding
├── layers (TransformerBlock × N)
│   ├── attention (MultiHeadAttention with RoPE)
│   └── feed_forward (SwiGLU)
├── norm (RMSNorm)
├── lm_head → logits
└── confidence_head → ConfidenceOutput
    ├── overall: main confidence score
    ├── epistemic: lack of knowledge
    ├── aleatoric: inherent ambiguity
    └── distribution_shift: OOD detection
```

## Next Steps After Phase 1

Once you have a working confidence head:

1. **Validate calibration** - ECE should be low, confidence should correlate with correctness
2. **Test on calibration dataset** - High-uncertainty questions should get low confidence
3. **Integrate with Prism** - Use confidence values as native `~>` outputs

Then move to Phase 2: Soft token propagation.

## Files

```
lumina_train/
├── __init__.py
├── config.py      # Model configurations
├── model.py       # LuminaModel with confidence head
├── losses.py      # Calibration losses
├── data.py        # Data loading
├── train.py       # Training loop
└── evaluate.py    # Evaluation and visualization
```
