#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

python -m lumina_basic.evaluation.eval_math_confidence \
  --model "${LUMINA_BASIC_MODEL:-Qwen/Qwen2.5-Math-1.5B-Instruct}" \
  --num-conf-heads "${LUMINA_BASIC_CONF_HEADS:-3}" \
  --data-path "${LUMINA_BASIC_MATH_DATA:-lumina_multimodel/datasets_hq_v2_curated/math_specialist/val.jsonl}" \
  --max-samples "${LUMINA_BASIC_MAX_SAMPLES:-100}" \
  --max-new-tokens "${LUMINA_BASIC_MAX_NEW_TOKENS:-24}" \
  --answer-conf-threshold "${LUMINA_BASIC_ANSWER_CONF:-0.50}" \
  --escalate-threshold "${LUMINA_BASIC_ESCALATE_CONF:-0.35}" \
  --seed "${LUMINA_BASIC_SEED:-7}" \
  --output-json "${LUMINA_BASIC_OUTPUT_JSON:-lumina_basic/notes/math_confidence_latest.json}"
