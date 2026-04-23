#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-/Volumes/ROCKET-nano/lumina_multimodel}"
DATA_ROOT="${DATA_ROOT:-$NVME_ROOT/datasets_hq_med_distill_v1}"

GENERAL_MODEL="${GENERAL_MODEL:-outputs_gen_overfit/general_Qwen_Qwen2.5-0.5B-Instruct_gen}"
MATH_MODEL="${MATH_MODEL:-outputs_gen_overfit/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen}"
CODE_MODEL="${CODE_MODEL:-outputs_gen_overfit/code_Qwen_Qwen2.5-0.5B-Instruct_gen}"

GENERAL_SAMPLES="${GENERAL_SAMPLES:-300}"
MATH_SAMPLES="${MATH_SAMPLES:-300}"
CODE_SAMPLES="${CODE_SAMPLES:-193}"
MAX_NEW_TOKENS="${MAX_NEW_TOKENS:-24}"
GENERAL_STRICT_ANSWER="${GENERAL_STRICT_ANSWER:-1}"
GENERAL_CONSTRAINED_POSTPROCESS="${GENERAL_CONSTRAINED_POSTPROCESS:-1}"
GENERAL_MAX_ANSWER_WORDS="${GENERAL_MAX_ANSWER_WORDS:-12}"

GENERAL_TARGET_F1="${GENERAL_TARGET_F1:-0.10}"
OUT_JSON="${OUT_JSON:-/tmp/lumina_domain_qa_gate.json}"

DEVICE="${DEVICE:-}"
TRANSFORMERS_OFFLINE="${TRANSFORMERS_OFFLINE:-1}"
HF_DATASETS_OFFLINE="${HF_DATASETS_OFFLINE:-1}"
PYTORCH_ENABLE_MPS_FALLBACK="${PYTORCH_ENABLE_MPS_FALLBACK:-1}"
if [[ -z "$DEVICE" ]]; then
  DEVICE="$(python - <<'PY'
import torch
print("mps" if torch.backends.mps.is_available() else "cpu")
PY
)"
fi
export DEVICE TRANSFORMERS_OFFLINE HF_DATASETS_OFFLINE PYTORCH_ENABLE_MPS_FALLBACK

run_eval() {
  local domain="$1"
  local model="$2"
  local samples="$3"
  shift 3
  local -a extra=("$@")
  local log="/tmp/lumina_qa_${domain}.log"

  if ((${#extra[@]})); then
    python -u -m evaluation.eval_generator_qa \
      --model-path "$model" \
      --data-root "$DATA_ROOT" \
      --domain "$domain" \
      --split val \
      --max-samples "$samples" \
      --max-new-tokens "$MAX_NEW_TOKENS" \
      --device "$DEVICE" \
      "${extra[@]}" \
      >"$log" 2>&1
  else
    python -u -m evaluation.eval_generator_qa \
      --model-path "$model" \
      --data-root "$DATA_ROOT" \
      --domain "$domain" \
      --split val \
      --max-samples "$samples" \
      --max-new-tokens "$MAX_NEW_TOKENS" \
      --device "$DEVICE" \
      >"$log" 2>&1
  fi

  local em f1 used
  used="$(awk -F'samples=' '/^split=/{print $2}' "$log" | tr -d '[:space:]')"
  em="$(awk -F'=' '/^em=/{print $2}' "$log")"
  f1="$(awk -F'=' '/^f1=/{print $2}' "$log")"
  printf '%s\t%s\t%s\t%s\n' "$domain" "$used" "$em" "$f1"
}

echo "domain\tsamples\tem\tf1"
general_extra=()
if [[ "$GENERAL_STRICT_ANSWER" == "1" ]]; then
  general_extra+=(--strict-answer)
fi
if [[ "$GENERAL_CONSTRAINED_POSTPROCESS" == "1" ]]; then
  general_extra+=(--constrained-postprocess --max-answer-words "$GENERAL_MAX_ANSWER_WORDS")
fi
gen_line="$(run_eval general "$GENERAL_MODEL" "$GENERAL_SAMPLES" "${general_extra[@]}")"
math_line="$(run_eval math "$MATH_MODEL" "$MATH_SAMPLES" --strict-answer --constrained-postprocess --max-answer-words 8 --math-canonical-metric)"
code_line="$(run_eval code "$CODE_MODEL" "$CODE_SAMPLES")"
echo "$gen_line"
echo "$math_line"
echo "$code_line"

general_f1="$(echo "$gen_line" | awk -F'\t' '{print $4}')"
passed="$(python - <<PY
f1=float("${general_f1}")
t=float("${GENERAL_TARGET_F1}")
print("1" if f1 >= t else "0")
PY
)"

python - <<PY
import json
out = {
  "general_target_f1": float("${GENERAL_TARGET_F1}"),
  "general_f1": float("${general_f1}"),
  "passed": bool(int("${passed}")),
}
with open("${OUT_JSON}", "w") as f:
  json.dump(out, f, indent=2)
print(f"Wrote ${OUT_JSON}")
PY

if [[ "$passed" == "1" ]]; then
  echo "GATE: PASS (general f1 >= ${GENERAL_TARGET_F1})"
  exit 0
fi

echo "GATE: FAIL (general f1 < ${GENERAL_TARGET_F1})"
exit 1
