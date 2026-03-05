# Distillation Data Pipeline (v1)

Goal: improve specialist generator quality by adding high-quality teacher answers into training data.

## 1) Required teacher dataset format

Folder layout:

```text
<teacher_root>/
  general_specialist/train.jsonl
  general_specialist/val.jsonl        # optional
  math_specialist/train.jsonl
  math_specialist/val.jsonl           # optional
  code_specialist/train.jsonl
  code_specialist/val.jsonl           # optional
```

Each row must be:

```json
{"question":"...","answer":"...","domain":"general|math|code"}
```

`domain` is optional in source rows; it is enforced during merge.

## 2) Build merged distilled dataset

Use base clean dataset + teacher data:

```bash
cd packages/lumina/lumina_multimodel
source .venv/bin/activate
export LUMINA_NVME_ROOT="/Volumes/ROCKET-nano/lumina_multimodel"

python data/prepare_distill_dataset.py \
  --base-root "$LUMINA_NVME_ROOT/datasets_hq_med_clean_v1" \
  --teacher-root "$LUMINA_NVME_ROOT/datasets_teacher_v1" \
  --out-root "$LUMINA_NVME_ROOT/datasets_hq_med_distill_v1" \
  --max-teacher-train 20000 \
  --teacher-weight 1.5 \
  --seed 42
```

## 3) Train + evaluate (fast gate)

```bash
mkdir -p "$LUMINA_NVME_ROOT/outputs_gen_stagea_v7"

DEVICE=mps python -m training.train_gpt2_generator \
  --data-root "$LUMINA_NVME_ROOT/datasets_hq_med_distill_v1" \
  --domain general --epochs 1 --batch-size 8 \
  --max-train-samples 60000 --max-val-samples 1000 \
  --model-name gpt2-medium --quality-weighting \
  --output-dir "$LUMINA_NVME_ROOT/outputs_gen_stagea_v7"
```

Repeat for `math` and `code`, then run `evaluation.eval_aggregator_minimal` with the same evaluation settings used in prior fast-gate runs.

## 4) Pass/fail gate

Promote to 3178/5000 confirm only if fast-gate improves:
- Aggregation F1 by >= +0.02 absolute, and
- Aggregation task score by >= +0.03 absolute

against the current local baseline trend.
