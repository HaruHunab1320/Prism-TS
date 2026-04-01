# Lumina Basic Experiment Log

## 2026-03-01 — Generator overfit sanity (distilgpt2, general)

Command:

```bash
DEVICE=cpu MODEL_NAME=distilgpt2 bash lumina_multimodel/tools/run_generator_overfit_sanity.sh general
```

Results:

- Train loss: `3.9634 -> 1.5988` (8 epochs, 200 train samples)
- Val loss: `3.8144 -> 4.4334`
- Train QA eval (200 samples): `EM=0.005`, `F1=0.107`
- Val QA eval (200 samples): `EM=0.000`, `F1=0.029`

Interpretation:

- Optimization is working (loss drops strongly), but answer-quality metrics remain near zero.
- This indicates objective/data-format mismatch for direct QA exactness, not an optimizer failure.
- Branching/routing cannot recover when base generator correctness is this low.

Next falsifiable step:

- Train with short-answer loss cap and stricter curation:
  - `--answer-max-tokens 8`
  - `--quality-weighting`
- Re-run same overfit sanity gate and compare train EM/F1.

## 2026-03-01 — Generator overfit sanity (short-answer + quality weighting)

Command:

```bash
DEVICE=cpu MODEL_NAME=distilgpt2 bash lumina_multimodel/tools/run_generator_overfit_sanity.sh general
```

Run config deltas (now default in script):

- `--answer-max-tokens 8`
- `--quality-weighting`

Results:

- Train loss: `3.2679 -> 1.2767`
- Val loss: `3.8625 -> 4.4709`
- Train QA eval (200 samples): `EM=0.000`, `F1=0.111`
- Val QA eval (200 samples): `EM=0.000`, `F1=0.031`

Interpretation:

- F1 moved slightly, EM remained zero.
- This confirms the root issue is not fixed by light loss shaping.
- Next step should be backbone/data-target shift (instruction-tuned base or distillation target style), not more threshold tuning.

## 2026-03-01 — Overfit sanity with stronger instruction-tuned base

Command:

```bash
DEVICE=cpu MODEL_NAME=Qwen/Qwen2.5-0.5B-Instruct TRAIN_N=200 VAL_N=200 EPOCHS=6 BATCH_SIZE=4 \
  bash lumina_multimodel/tools/run_generator_overfit_sanity.sh general
```

Implementation note:

- `training/train_gpt2_generator.py` was updated to use `AutoTokenizer` + `AutoModelForCausalLM`,
  so non-GPT2 architectures can be trained correctly.

Results:

- Train loss: `2.1422 -> 0.0469`
- Val loss: `2.7666 -> 3.2971`
- Train QA eval (200 samples): `EM=0.020`, `F1=0.249`
- Val QA eval (200 samples): `EM=0.005`, `F1=0.047`

Interpretation:

- This is better than distilgpt2 on the same harness (especially train F1), so backbone matters.
- But validation accuracy is still too low for downstream confidence/branching to work well.
- Next gain likely comes from data/target alignment (instruction-style distillation) rather than further threshold tuning.

## 2026-03-01 — Overfit sanity on distilled dataset (Qwen 0.5B Instruct)

Command:

```bash
DEVICE=cpu MODEL_NAME=Qwen/Qwen2.5-0.5B-Instruct \
DATA_ROOT=/Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
TRAIN_N=200 VAL_N=200 EPOCHS=6 BATCH_SIZE=4 \
bash lumina_multimodel/tools/run_generator_overfit_sanity.sh general
```

Results:

- Train loss: `2.6570 -> 0.0468`
- Val loss: `3.2241 -> 3.6124`
- Train QA eval (200 samples): `EM=0.000`, `F1=0.290`
- Val QA eval (200 samples): `EM=0.000`, `F1=0.050`

Interpretation:

- Distilled data improved train F1 further (`0.249 -> 0.290`) and slightly improved val F1 (`0.047 -> 0.050`).
- EM remains zero, so exact-answer behavior is still not learned.
- Next experiments should target answer format/objective and decoding policy, not more confidence policy tuning.

## 2026-03-01 — Strict short-answer prompt test (Qwen + distilled)

Command:

```bash
DEVICE=cpu MODEL_NAME=Qwen/Qwen2.5-0.5B-Instruct \
DATA_ROOT=/Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
TRAIN_N=200 VAL_N=200 EPOCHS=6 BATCH_SIZE=4 STRICT_ANSWER=1 \
bash lumina_multimodel/tools/run_generator_overfit_sanity.sh general
```

Results:

- Train loss: `2.6656 -> 0.0346`
- Val loss: `3.1740 -> 3.6616`
- Train QA eval (200 samples): `EM=0.010`, `F1=0.300`
- Val QA eval (200 samples): `EM=0.000`, `F1=0.055`

Interpretation:

- Short-answer prompt improves F1 further (best so far), and gives small train EM signal.
- Validation EM remains zero, so we still do not generalize exact-answer formatting.
- Next experiment should target output normalization/decoding constraints or label format (e.g., canonical one-line answer targets).

## 2026-03-01 — Constrained postprocess + strict short-answer

Command:

```bash
DEVICE=cpu MODEL_NAME=Qwen/Qwen2.5-0.5B-Instruct \
DATA_ROOT=/Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
TRAIN_N=200 VAL_N=200 EPOCHS=6 BATCH_SIZE=4 \
STRICT_ANSWER=1 CONSTRAINED_POSTPROCESS=1 MAX_ANSWER_WORDS=6 \
bash lumina_multimodel/tools/run_generator_overfit_sanity.sh general
```

Results:

- Train loss: `2.6156 -> 0.0286`
- Val loss: `3.2264 -> 3.6267`
- Train QA eval (200 samples): `EM=0.195`, `F1=0.623`
- Val QA eval (200 samples): `EM=0.025`, `F1=0.099`

Interpretation:

- This is the first meaningful EM lift; decoding/postprocess constraints materially help exactness.
- Validation remains low but no longer near-zero.
- Next step is to verify this at larger sample sizes and then feed these generator outputs into aggregator eval.

## 2026-03-01 — Cross-domain check (strict + constrained decode, Qwen + distilled)

Shared command template:

```bash
DEVICE=cpu MODEL_NAME=Qwen/Qwen2.5-0.5B-Instruct \
DATA_ROOT=/Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
TRAIN_N=200 EPOCHS=6 BATCH_SIZE=4 \
STRICT_ANSWER=1 CONSTRAINED_POSTPROCESS=1 MAX_ANSWER_WORDS=6 \
bash lumina_multimodel/tools/run_generator_overfit_sanity.sh <domain>
```

Math (`VAL_N=200`) results:

- Train loss: `0.3183 -> 0.0249`
- Val loss: `1.0387 -> 1.8949`
- Train eval: `EM=0.055`, `F1=0.055`
- Val eval: `EM=0.000`, `F1=0.000`

Code (`VAL_N=193`) results:

- Train loss: `1.7556 -> 0.0639`
- Val loss: `1.7091 -> 2.1923`
- Train eval: `EM=0.005`, `F1=0.377`
- Val eval: `EM=0.000`, `F1=0.206`

Interpretation:

- General improved meaningfully with constrained decoding.
- Math failed hard on this setup (zero val signal).
- Code shows non-trivial val F1 but still zero EM.
- This indicates domain-specific decoding/label normalization is required before expecting stable aggregator lift.

## 2026-03-01 — Partial aggregator gate (general+code only)

Command:

```bash
cd lumina_multimodel
DEVICE=cpu TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 \
python -m evaluation.eval_aggregator_minimal \
  --data-root /Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
  --domains general code \
  --weights outputs_gpt2/general_gpt2_confidence.pt outputs_gpt2/code_gpt2_confidence.pt \
  --generator-model Qwen/Qwen2.5-0.5B-Instruct \
  --generator-domain-weights outputs_gen_overfit/general_Qwen_Qwen2.5-0.5B-Instruct_gen outputs_gen_overfit/code_Qwen_Qwen2.5-0.5B-Instruct_gen \
  --router-weights outputs_router/router.pt \
  --router-labels outputs_router/labels.json \
  --max-samples 400 --max-new-tokens 24 --alpha 0.7 --top-k 2 \
  --abstain-threshold 0.55 --conflict-margin 0.05
```

Results:

- Samples: `393`
- Route accuracy: `0.720`
- Aggregation EM (answered): `0.000`
- Aggregation F1 (answered): `0.112`
- Aggregation task score (answered): `0.195`
- Task success@0.7 (answered): `0.006`
- Abstain rate: `0.160`

Interpretation:

- End-to-end still low despite better per-domain generator behavior on general/code.
- Upstream generator quality improved but remains insufficient for aggregator-level exactness.

## 2026-03-01 — Math canonical target experiment

Config changes:

- Added `--math-canonical-targets` to training (numeric/final-answer canonicalization).
- Added `--math-canonical-metric` to eval to compare canonicalized math answers.

Command:

```bash
DEVICE=cpu MODEL_NAME=Qwen/Qwen2.5-0.5B-Instruct \
DATA_ROOT=/Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
TRAIN_N=200 VAL_N=200 EPOCHS=6 BATCH_SIZE=4 \
STRICT_ANSWER=1 CONSTRAINED_POSTPROCESS=1 MAX_ANSWER_WORDS=6 MATH_CANONICAL=1 \
bash lumina_multimodel/tools/run_generator_overfit_sanity.sh math
```

Results:

- Train eval: `EM=0.020`, `F1=0.020`
- Val eval: `EM=0.000`, `F1=0.000`

Interpretation:

- This normalization did not recover math on the current dataset/model recipe.

## 2026-03-01 — Math domain-aware quality weighting patch

Change:

- `training/train_gpt2_generator.py`:
  - `sample_quality()` now treats short numeric math answers as high quality (no penalty).
  - Added math-specific strict prompt: `Answer (single number only):`.
  - Added `QADataset(..., domain=...)` so prompt style is domain-aware.

Command:

```bash
DEVICE=cpu MODEL_NAME=Qwen/Qwen2.5-0.5B-Instruct \
DATA_ROOT=/Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
TRAIN_N=200 VAL_N=200 EPOCHS=6 BATCH_SIZE=4 \
STRICT_ANSWER=1 CONSTRAINED_POSTPROCESS=1 MAX_ANSWER_WORDS=6 MATH_CANONICAL=1 \
bash lumina_multimodel/tools/run_generator_overfit_sanity.sh math
```

Results:

- Train loss: `0.2187 -> 0.0313`
- Val loss: `1.0700 -> 1.8223`
- Train eval: `EM=0.025`, `F1=0.025`
- Val eval: `EM=0.000`, `F1=0.000`

Interpretation:

- Math still fails to generalize with current recipe despite prompt/weighting fixes.
- Root issue appears to be data/target mismatch for math reasoning, not simple quality weights.

## 2026-03-01 — Math-clean dataset slice (numeric-only targets)

Build command:

```bash
LUMINA_NVME_ROOT=/Volumes/ROCKET-nano/lumina_multimodel \
bash lumina_multimodel/tools/build_math_clean_slice_v1.sh
```

Build result:

- `datasets_math_clean_v1/math_specialist/train.jsonl`: `8103`
- `datasets_math_clean_v1/math_specialist/val.jsonl`: `1319`

Overfit command:

```bash
DEVICE=cpu MODEL_NAME=Qwen/Qwen2.5-0.5B-Instruct \
DATA_ROOT=/Volumes/ROCKET-nano/lumina_multimodel/datasets_math_clean_v1 \
TRAIN_N=200 VAL_N=200 EPOCHS=6 BATCH_SIZE=4 \
STRICT_ANSWER=1 CONSTRAINED_POSTPROCESS=1 MAX_ANSWER_WORDS=6 MATH_CANONICAL=1 \
bash lumina_multimodel/tools/run_generator_overfit_sanity.sh math
```

Results:

- Train loss: `0.2091 -> 0.0209`
- Val loss: `1.0545 -> 1.7466`
- Train eval: `EM=0.010`, `F1=0.010`
- Val eval: `EM=0.005`, `F1=0.005`

Interpretation:

- Numeric-only cleanup gives a small positive move (val EM from `0.000` to `0.005`), but still far below useful levels.
- Math specialist remains the weakest component and likely needs a different backbone/objective (not just data filtering).

## 2026-03-01 — Math-specialized backbone gate (Qwen2.5-Math-1.5B)

Command:

```bash
DEVICE=cpu MODEL_NAME=Qwen/Qwen2.5-Math-1.5B-Instruct \
DATA_ROOT=/Volumes/ROCKET-nano/lumina_multimodel/datasets_math_clean_v1 \
TRAIN_N=200 VAL_N=200 EPOCHS=3 BATCH_SIZE=2 \
STRICT_ANSWER=1 CONSTRAINED_POSTPROCESS=1 MAX_ANSWER_WORDS=6 MATH_CANONICAL=1 \
bash lumina_multimodel/tools/run_generator_overfit_sanity.sh math
```

Results:

- Train loss: `0.1661 -> 0.0351`
- Val loss: `0.7541 -> 1.1805`
- Train eval: `EM=0.740`, `F1=0.740`
- Val eval: `EM=0.115`, `F1=0.115`

Interpretation:

- This is a major jump vs the prior math runs (val EM from ~`0.000-0.005` to `0.115`).
- Confirms math bottleneck is primarily backbone/objective mismatch, not just routing logic.
- Next action: keep this math model and rerun 3-domain aggregator with mixed generators.

## 2026-03-01 — Mixed 3-domain aggregator smoke with new math backbone

Command (smoke):

```bash
cd lumina_multimodel
DEVICE=cpu TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 \
python -m evaluation.eval_aggregator_minimal \
  --data-root /Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
  --domains general math code \
  --weights outputs_gpt2/general_gpt2_confidence.pt outputs_gpt2/math_gpt2_confidence.pt outputs_gpt2/code_gpt2_confidence.pt \
  --generator-model Qwen/Qwen2.5-0.5B-Instruct \
  --generator-domain-weights outputs_gen_overfit/general_Qwen_Qwen2.5-0.5B-Instruct_gen outputs_gen_overfit/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen outputs_gen_overfit/code_Qwen_Qwen2.5-0.5B-Instruct_gen \
  --router-weights outputs_router/router.pt \
  --router-labels outputs_router/labels.json \
  --max-samples 12 --max-new-tokens 24 --alpha 0.7 --top-k 2 \
  --abstain-threshold 0.55 --conflict-margin 0.05
```

Results:

- Samples: `12`
- Route accuracy: `0.500`
- Aggregation EM (answered): `0.000`
- Aggregation F1 (answered): `0.058`
- Aggregation task score (answered): `0.105`
- Task success@0.7 (answered): `0.000`
- Abstain rate: `0.500`

Interpretation:

- Smoke confirms mixed-model pipeline runs, but quality is still low.
- Need a larger (stable) gate run and likely confidence/reward tuning for mixed backbones.

## 2026-03-01 — Stable mixed 3-domain gate (120 samples)

Command:

```bash
cd lumina_multimodel
DEVICE=cpu TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 \
python -m evaluation.eval_aggregator_minimal \
  --data-root /Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
  --domains general math code \
  --weights outputs_gpt2/general_gpt2_confidence.pt outputs_gpt2/math_gpt2_confidence.pt outputs_gpt2/code_gpt2_confidence.pt \
  --generator-model Qwen/Qwen2.5-0.5B-Instruct \
  --generator-domain-weights outputs_gen_overfit/general_Qwen_Qwen2.5-0.5B-Instruct_gen outputs_gen_overfit/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen outputs_gen_overfit/code_Qwen_Qwen2.5-0.5B-Instruct_gen \
  --router-weights outputs_router/router.pt \
  --router-labels outputs_router/labels.json \
  --max-samples 120 --max-new-tokens 24 --alpha 0.7 --top-k 2 \
  --abstain-threshold 0.55 --conflict-margin 0.05
```

Results:

- Samples: `120`
- Route accuracy: `0.508`
- Aggregation EM (answered): `0.000`
- Aggregation F1 (answered): `0.050`
- Aggregation task score (answered): `0.115`
- Task success@0.7 (answered): `0.024`
- Abstain rate: `0.308`

## 2026-03-01 — Quick tuning sweep (30-sample directional)

`alpha=0.5, abstain=0.45, margin=0.03`:
- Route: `0.567`, F1: `0.025`, task score: `0.062`, abstain: `0.167`

`alpha=0.7, abstain=0.55, margin=0.05`:
- Route: `0.467`, F1: `0.035`, task score: `0.067`, abstain: `0.467`

`alpha=0.9, abstain=0.45, margin=0.03`:
- Route: `0.400`, F1: `0.032`, task score: `0.073`, abstain: `0.200`

Interpretation:

- Mixed generator stack is now operational but still under baseline expectations.
- Score is sensitive to gate settings, but all settings remain low quality.
- Core next bottleneck remains confidence/aggregation calibration for heterogeneous generators.

## 2026-03-01 — Mixed-backbone confidence calibration + retest

Calibration build command:

```bash
cd lumina_multimodel
DEVICE=cpu TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 \
python -m evaluation.build_mixed_conf_calibration \
  --data-root /Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1 \
  --domains general math code \
  --weights outputs_gpt2/general_gpt2_confidence.pt outputs_gpt2/math_gpt2_confidence.pt outputs_gpt2/code_gpt2_confidence.pt \
  --generator-domain-weights outputs_gen_overfit/general_Qwen_Qwen2.5-0.5B-Instruct_gen outputs_gen_overfit/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen outputs_gen_overfit/code_Qwen_Qwen2.5-0.5B-Instruct_gen \
  --max-samples 60 --max-new-tokens 24 \
  --output outputs_gpt2/conf_calibration_mixed_qwen.json
```

Calibration coefficients:

- general: `a=-0.772`, `b=0.317`
- math: `a=-4.665`, `b=3.367`
- code: `a=-2.938`, `b=1.913`

120-sample retest with calibration:

```bash
DEVICE=cpu TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 \
python -m evaluation.eval_aggregator_minimal \
  ... \
  --conf-calibration outputs_gpt2/conf_calibration_mixed_qwen.json
```

Results (calibrated):

- Samples: `120`
- Route accuracy: `0.458`
- Aggregation EM (answered): `0.000`
- Aggregation F1 (answered): `0.079`
- Aggregation task score (answered): `0.154`
- Task success@0.7 (answered): `0.031`
- Abstain rate: `0.200`
- Agreement rate (top-2): `0.067`

Comparison vs uncalibrated 120 run:

- F1: `0.050 -> 0.079` (improved)
- Task score: `0.115 -> 0.154` (improved)
- Task success@0.7: `0.024 -> 0.031` (improved)
- Abstain: `0.308 -> 0.200` (improved)
- Route accuracy: `0.508 -> 0.458` (worse)

## 2026-03-01 — Calibrated alpha sweep (mixed backbones)

Shared config:

- `max-samples=120`, `top-k=2`, `abstain=0.55`, `margin=0.05`
- `conf-calibration=outputs_gpt2/conf_calibration_mixed_qwen.json`

`alpha=0.7` (baseline calibrated):
- Route: `0.458`
- F1: `0.079`
- Task score: `0.154`
- Success@0.7: `0.031`
- Abstain: `0.200`

`alpha=0.5`:
- Route: `0.475`
- F1: `0.096`
- Task score: `0.177`
- Success@0.7: `0.028`
- Abstain: `0.108`

Interpretation:

- Lower alpha (`0.5`) improved F1/task score and abstention while slightly improving route accuracy.
- Current best observed operating point (with mixed calibration): `alpha=0.5`.

## 2026-03-02 — 300-sample calibrated gate (mixed backbones)

Command used:

```bash
cd lumina_multimodel
bash scripts/run_eval_hq_med_distill_300_a05_local.sh
```

Config snapshot:

- Dataset: `/Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1`
- Calibration: `outputs_gpt2/conf_calibration_mixed_qwen.json`
- Alpha / abstain / margin: `0.5 / 0.55 / 0.05`
- Generators:
  - general: `outputs_gen_overfit/general_Qwen_Qwen2.5-0.5B-Instruct_gen`
  - math: `outputs_gen_overfit/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen`
  - code: `outputs_gen_overfit/code_Qwen_Qwen2.5-0.5B-Instruct_gen`

Results:

- Samples: `300`
- Route accuracy: `0.510`
- Aggregation EM (answered): `0.000`
- Aggregation F1 (answered): `0.099`
- Aggregation task score (answered): `0.176`
- Task success@0.7 (answered): `0.038`
- Abstain rate: `0.123`
- Agreement rate (top-2): `0.023`

Takeaway:

- 300-sample gate preserves the same operating profile seen at 120 samples:
  - low absolute task success,
  - modestly improved aggregation quality under calibrated mixed routing,
  - abstention controlled but still non-trivial.

## 2026-03-02 — 300-sample ORACLE diagnostic (mixed backbones)

Command used:

```bash
cd lumina_multimodel
bash scripts/run_eval_hq_med_distill_300_a05_oracle_local.sh
```

Results:

- Samples: `300`
- Route accuracy: `0.510`
- Aggregation EM (answered): `0.000`
- Aggregation F1 (answered): `0.100`
- Aggregation task score (answered): `0.177`
- Task success@0.7 (answered): `0.038`
- Abstain rate: `0.123`
- Agreement rate (top-2): `0.023`
- Mode: `ORACLE (diagnostic)`

Interpretation:

- ORACLE metrics are effectively identical to the non-ORACLE 300 run.
- This suggests confidence scoring/routing is not the dominant bottleneck at current settings.
- Primary bottleneck remains generator answer quality.

## 2026-03-02 — Domain generator QA check + single-domain swap ablations

### Per-domain generator QA (val split, same data root)

Data root: `/Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_med_distill_v1`

- General generator (`outputs_gen_overfit/general_Qwen_Qwen2.5-0.5B-Instruct_gen`)
  - samples: `300`
  - EM: `0.000`
  - F1: `0.052`
- Math generator (`outputs_gen_overfit/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen`)
  - samples: `300`
  - EM: `0.117`
  - F1: `0.117`
- Code generator (`outputs_gen_overfit/code_Qwen_Qwen2.5-0.5B-Instruct_gen`)
  - samples: `193` (full val available)
  - EM: `0.000`
  - F1: `0.264`

### 300-sample mixed-stack swap ablations (`alpha=0.5`, calibrated)

Shared settings:
- `max-samples=300`, `max-new-tokens=24`
- `conf-calibration=outputs_gpt2/conf_calibration_mixed_qwen.json`
- route/config held fixed; only generator paths changed

`baseline_gpt2` (all 3 from `outputs_gen/*_gpt2_gen`):
- Route accuracy: `0.510`
- F1: `0.082`
- Task score: `0.144`
- Success@0.7: `0.015`
- Abstain: `0.137`

`swap_math_qwen` (only math -> `Qwen2.5-Math-1.5B`):
- Route accuracy: `0.510`
- F1: `0.082`
- Task score: `0.145`
- Success@0.7: `0.015`
- Abstain: `0.133`

`swap_general_qwen` (only general -> `Qwen2.5-0.5B`):
- Route accuracy: `0.510`
- F1: `0.082`
- Task score: `0.146`
- Success@0.7: `0.015`
- Abstain: `0.137`

`swap_code_qwen` (only code -> `Qwen2.5-0.5B`):
- Route accuracy: `0.510`
- F1: `0.098`
- Task score: `0.175`
- Success@0.7: `0.038`
- Abstain: `0.130`

Interpretation:

- Largest lift comes from swapping the code generator.
- Math and general single-domain swaps are effectively flat at this operating point.
- Next high-value action: run `code+math` combined swap, then `all-qwen` on the same 300 config to verify additive gains and check whether remaining bottleneck is mostly general-domain generation.

## 2026-03-02 — Combined swap follow-up (300 samples, calibrated)

Shared settings:
- `max-samples=300`, `max-new-tokens=24`, `alpha=0.5`
- `abstain=0.55`, `margin=0.05`, `seed=7`
- `conf-calibration=outputs_gpt2/conf_calibration_mixed_qwen.json`

`swap_code+math_qwen` (general GPT2, math Qwen-Math, code Qwen):
- Route accuracy: `0.510`
- F1: `0.099`
- Task score: `0.176`
- Success@0.7: `0.038`
- Abstain: `0.127`
- Agreement: `0.000`

`all_qwen` (general Qwen, math Qwen-Math, code Qwen):
- Route accuracy: `0.510`
- F1: `0.099`
- Task score: `0.176`
- Success@0.7: `0.038`
- Abstain: `0.123`
- Agreement: `0.023`

Interpretation:
- `code+math` already reaches the same F1/task/success as `all_qwen`.
- Swapping general from GPT2 -> Qwen does not improve primary quality metrics at this operating point.
- Current bottleneck is not routing; generator improvements are now mostly coming from code (and math parity), while general swap gives negligible gain on this dataset slice.

## 2026-03-03 — General v2 train + QA gate rerun

Training command:

```bash
cd lumina_multimodel
bash scripts/train_general_v2.sh
```

Training result:

- Model: `Qwen/Qwen2.5-0.5B-Instruct` (general domain)
- Epoch 1/1: `train_loss=2.3903`, `val_loss=2.8071`
- Saved: `outputs_gen_overfit_v2/general_Qwen_Qwen2.5-0.5B-Instruct_gen`

Gate/eval command:

```bash
cd lumina_multimodel
GENERAL_MODEL=outputs_gen_overfit_v2/general_Qwen_Qwen2.5-0.5B-Instruct_gen \
bash scripts/run_domain_qa_gate.sh
```

Gate results:

- general: `samples=300`, `EM=0.000`, `F1=0.078`
- math: `samples=300`, `EM=0.117`, `F1=0.117`
- code: `samples=193`, `EM=0.000`, `F1=0.264`
- Gate target (`general F1 >= 0.10`): **FAIL**

Interpretation:

- General improved from `0.052 -> 0.078`, but still below gate threshold.
- Aggregator rerun was correctly skipped by the gate policy.

## 2026-03-03 — General v3 attempt (2 epochs / deeper unfreeze)

Training config:

- `MODEL_NAME=Qwen/Qwen2.5-0.5B-Instruct`
- `OUTPUT_DIR=outputs_gen_overfit_v3`
- `EPOCHS=2`
- `UNFREEZE_N=4`
- `MAX_TRAIN_SAMPLES=40000`
- `LR=1e-5`
- `ANSWER_MAX_TOKENS=10`

Training result:

- Epoch 1/2: `train_loss=2.3881`, `val_loss=2.4796`
- Epoch 2/2: `train_loss=1.4142`, `val_loss=2.5599`
- Saved: `outputs_gen_overfit_v3/general_Qwen_Qwen2.5-0.5B-Instruct_gen`

QA gate with v3 general:

- general: `samples=300`, `EM=0.000`, `F1=0.079`
- math: `samples=300`, `EM=0.117`, `F1=0.117`
- code: `samples=193`, `EM=0.000`, `F1=0.264`
- Gate target (`general F1 >= 0.10`): **FAIL**

Post-gate action:

- `run_agg_gate_if_pass.sh` executed and correctly skipped aggregator (`Gate failed. Skipping aggregator run.`)

Ops note:

- Script defaults were updated to prefer MPS when available, but auto-fallback to CPU when MPS is unavailable on host OS.

## 2026-03-30 — Lumina Basic math confidence probe (cloud, Qwen Math 1.5B)

Cloud run:

```bash
cd lumina_multimodel/tools/cloud
bash launch_experiments.sh experiments_lumina_basic_math_confidence.yaml
```

Run:

- `lumina-basic-math-confidence-002`

Probe training (`1000` train / `200` val):

- model: `Qwen/Qwen2.5-Math-1.5B-Instruct`
- val `AUROC`: `0.683`
- val `ECE`: `0.031`
- val `Brier`: `0.119`

Math confidence contract eval (`500` val):

- always-answer accuracy: `0.144`
- baseline `AUROC`: `0.635`
- baseline `ECE`: `0.053`

Selective-answer threshold sweep:

- `thr=0.05`
  - coverage: `0.862`
  - selective accuracy: `0.165`
- `thr=0.10`
  - coverage: `0.702`
  - selective accuracy: `0.185`
- `thr=0.25`
  - coverage: `0.250`
  - selective accuracy: `0.208`
- `thr=0.30`
  - coverage: `0.128`
  - selective accuracy: `0.234`

Escalation policy:

- always-answer accuracy under current escalation path: `0.150`
- current escalation sweep underperforms the baseline selective-answer policy

Interpretation:

- This is the first real positive result for `lumina_basic`.
- Learned answer-confidence carries usable signal for selective answering.
- The fixed `0.50` threshold was wrong; useful operating range is much lower.
- Current escalation design is not validated and should not be treated as a win.

Decision:

- Keep the learned confidence head path.
- Promote selective answering as the active control behavior.
- Treat escalation as an open problem, not a validated mechanism.

Policy selection from the 500-sample cloud sweep:

- baseline selective policy is the winner
- best threshold with `min_coverage >= 0.25` and `gain >= 0.02`:
  - `threshold = 0.25`
  - coverage: `0.250`
  - selective accuracy: `0.208`
  - gain vs always-answer: `+0.064`
- if we allow lower coverage (`>= 0.10`), the highest-gain baseline point is:
  - `threshold = 0.30`
  - coverage: `0.128`
  - selective accuracy: `0.234`
  - gain vs always-answer: `+0.090`
- escalation policy did not meet the same gain target at useful coverage

Operational conclusion:

- use baseline selective answering as the active math-confidence policy
- do not promote the current escalation policy


## 2026-04-01 — Math confidence policy stability (cloud, 3 seeds)

Cloud run:

```bash
cd lumina_multimodel/tools/cloud
bash launch_experiments.sh experiments_lumina_basic_math_policy_stability.yaml
```

Run:

- `lumina-basic-math-policy-stability-001`

Probe training (`1000` train / `200` val):

- model: `Qwen/Qwen2.5-Math-1.5B-Instruct`
- val `AUROC`: `0.683`
- val `ECE`: `0.031`
- val `Brier`: `0.119`

Fixed-policy stability summary over seeds `7`, `11`, `19`:

`threshold = 0.25`

- coverage mean: `0.250` (`0.226` to `0.274`)
- selective accuracy mean: `0.209` (`0.190` to `0.230`)
- gain vs always-answer mean: `+0.070`
- always-answer accuracy mean: `0.139`

`threshold = 0.30`

- coverage mean: `0.139` (`0.120` to `0.168`)
- selective accuracy mean: `0.257` (`0.234` to `0.300`)
- gain vs always-answer mean: `+0.118`
- always-answer accuracy mean: `0.139`

Interpretation:

- The selective-answer lift is stable across seeds.
- `0.25` remains the practical operating point.
- `0.30` remains the higher-precision research point with much lower coverage.
- This validates selective answering as the current `lumina_basic` baseline control behavior.

Decision:

- Freeze `threshold = 0.25` as the default math selective-answer policy.
- Keep `threshold = 0.30` as the stricter research policy.
- Do not revisit threshold tuning before testing a stronger escalation design.
- Next experiment is a structured verification-style escalation pass, not another sweep.
