#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

DEFAULT_MODEL="Qwen/Qwen2.5-Math-1.5B-Instruct"
DEFAULT_CONF_HEAD="lumina_basic/outputs/math_confidence_probe.pt"

if [[ -d "lumina_multimodel/outputs_gen/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen" ]]; then
  DEFAULT_MODEL="lumina_multimodel/outputs_gen/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen"
fi

if [[ -f "lumina_multimodel/outputs_gen/lumina_basic_qwen_math_probe_v2_stability.pt" ]]; then
  DEFAULT_CONF_HEAD="lumina_multimodel/outputs_gen/lumina_basic_qwen_math_probe_v2_stability.pt"
elif [[ -f "lumina_multimodel/outputs_gen/lumina_basic_qwen_math_probe_v2_on_ft.pt" ]]; then
  DEFAULT_CONF_HEAD="lumina_multimodel/outputs_gen/lumina_basic_qwen_math_probe_v2_on_ft.pt"
fi

python -m lumina_basic.evaluation.eval_math_confidence \
  --model "${LUMINA_BASIC_MODEL:-$DEFAULT_MODEL}" \
  --num-conf-heads "${LUMINA_BASIC_CONF_HEADS:-3}" \
  --data-path "${LUMINA_BASIC_MATH_DATA:-lumina_multimodel/datasets_hq_v2_curated/math_specialist/val.jsonl}" \
  --max-samples "${LUMINA_BASIC_MAX_SAMPLES:-100}" \
  --max-new-tokens "${LUMINA_BASIC_MAX_NEW_TOKENS:-24}" \
  --confidence-head "${LUMINA_BASIC_CONFIDENCE_HEAD:-$DEFAULT_CONF_HEAD}" \
  --math-contract-features \
  --answer-conf-threshold "${LUMINA_BASIC_ANSWER_CONF:-0.20}" \
  --escalate-threshold "${LUMINA_BASIC_ESCALATE_CONF:-0.35}" \
  --seed "${LUMINA_BASIC_SEED:-7}" \
  --output-json "${LUMINA_BASIC_OUTPUT_JSON:-lumina_basic/notes/math_confidence_latest.json}"
