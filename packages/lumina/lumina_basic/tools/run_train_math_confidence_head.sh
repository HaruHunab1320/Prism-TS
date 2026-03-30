#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

python -m lumina_basic.training.train_math_confidence_head \
  --model "${LUMINA_BASIC_MODEL:-Qwen/Qwen2.5-Math-1.5B-Instruct}" \
  --num-conf-heads "${LUMINA_BASIC_CONF_HEADS:-3}" \
  --train-data "${LUMINA_BASIC_MATH_TRAIN_DATA:-lumina_multimodel/datasets_hq_v2_curated/math_specialist/train.jsonl}" \
  --val-data "${LUMINA_BASIC_MATH_VAL_DATA:-lumina_multimodel/datasets_hq_v2_curated/math_specialist/val.jsonl}" \
  --max-train-samples "${LUMINA_BASIC_MAX_TRAIN_SAMPLES:-500}" \
  --max-val-samples "${LUMINA_BASIC_MAX_VAL_SAMPLES:-100}" \
  --max-new-tokens "${LUMINA_BASIC_MAX_NEW_TOKENS:-24}" \
  --epochs "${LUMINA_BASIC_TRAIN_EPOCHS:-20}" \
  --batch-size "${LUMINA_BASIC_TRAIN_BATCH_SIZE:-64}" \
  --lr "${LUMINA_BASIC_TRAIN_LR:-1e-3}" \
  --output "${LUMINA_BASIC_CONF_HEAD_PATH:-lumina_basic/outputs/math_confidence_probe.pt}" \
  --metrics-json "${LUMINA_BASIC_TRAIN_OUTPUT_JSON:-lumina_basic/notes/math_confidence_probe_latest.json}"
