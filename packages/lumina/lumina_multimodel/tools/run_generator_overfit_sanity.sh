#!/usr/bin/env bash
set -euo pipefail

# Fast falsifiable check:
# 1) Train on a tiny train slice (default 200)
# 2) Evaluate EM/F1 on the same train slice and on val slice

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PKG_DIR}"

DOMAIN="${1:-general}"
TRAIN_N="${TRAIN_N:-200}"
VAL_N="${VAL_N:-200}"
EPOCHS="${EPOCHS:-8}"
BATCH_SIZE="${BATCH_SIZE:-8}"
MODEL_NAME="${MODEL_NAME:-gpt2}"
DEVICE="${DEVICE:-mps}"
OUT_DIR="${OUT_DIR:-outputs_gen_overfit}"
MAX_NEW_TOKENS="${MAX_NEW_TOKENS:-24}"
DATA_ROOT="${DATA_ROOT:-datasets_hq_v2_curated}"
ANSWER_MAX_TOKENS="${ANSWER_MAX_TOKENS:-8}"
QUALITY_WEIGHTING="${QUALITY_WEIGHTING:-1}"
STRICT_ANSWER="${STRICT_ANSWER:-0}"
CONSTRAINED_POSTPROCESS="${CONSTRAINED_POSTPROCESS:-1}"
MAX_ANSWER_WORDS="${MAX_ANSWER_WORDS:-8}"
MATH_CANONICAL="${MATH_CANONICAL:-0}"

echo "== Overfit sanity: domain=${DOMAIN} model=${MODEL_NAME} train_n=${TRAIN_N} epochs=${EPOCHS} =="

TRAIN_ARGS=(
  --data-root "${DATA_ROOT}"
  --domain "${DOMAIN}"
  --epochs "${EPOCHS}"
  --batch-size "${BATCH_SIZE}"
  --answer-max-tokens "${ANSWER_MAX_TOKENS}"
  --max-train-samples "${TRAIN_N}"
  --max-val-samples "${VAL_N}"
  --unfreeze-n 12
  --output-dir "${OUT_DIR}"
  --model-name "${MODEL_NAME}"
)
if [ "${QUALITY_WEIGHTING}" = "1" ]; then
  TRAIN_ARGS+=(--quality-weighting)
fi
if [ "${STRICT_ANSWER}" = "1" ]; then
  TRAIN_ARGS+=(--strict-answer)
fi
if [ "${MATH_CANONICAL}" = "1" ] && [ "${DOMAIN}" = "math" ]; then
  TRAIN_ARGS+=(--math-canonical-targets)
fi

DEVICE="${DEVICE}" python -m training.train_gpt2_generator "${TRAIN_ARGS[@]}"

SAFE_MODEL="${MODEL_NAME//\//_}"
MODEL_PATH="${OUT_DIR}/${DOMAIN}_${SAFE_MODEL}_gen"

echo "== Eval on train =="
EVAL_TRAIN_ARGS=(
  --model-path "${MODEL_PATH}"
  --data-root "${DATA_ROOT}"
  --domain "${DOMAIN}"
  --split train
  --max-samples "${TRAIN_N}"
  --max-new-tokens "${MAX_NEW_TOKENS}"
)
if [ "${STRICT_ANSWER}" = "1" ]; then
  EVAL_TRAIN_ARGS+=(--strict-answer)
fi
if [ "${CONSTRAINED_POSTPROCESS}" = "1" ]; then
  EVAL_TRAIN_ARGS+=(--constrained-postprocess --max-answer-words "${MAX_ANSWER_WORDS}")
fi
if [ "${MATH_CANONICAL}" = "1" ] && [ "${DOMAIN}" = "math" ]; then
  EVAL_TRAIN_ARGS+=(--math-canonical-metric)
fi
python -m evaluation.eval_generator_qa "${EVAL_TRAIN_ARGS[@]}"

echo "== Eval on val =="
EVAL_VAL_ARGS=(
  --model-path "${MODEL_PATH}"
  --data-root "${DATA_ROOT}"
  --domain "${DOMAIN}"
  --split val
  --max-samples "${VAL_N}"
  --max-new-tokens "${MAX_NEW_TOKENS}"
)
if [ "${STRICT_ANSWER}" = "1" ]; then
  EVAL_VAL_ARGS+=(--strict-answer)
fi
if [ "${CONSTRAINED_POSTPROCESS}" = "1" ]; then
  EVAL_VAL_ARGS+=(--constrained-postprocess --max-answer-words "${MAX_ANSWER_WORDS}")
fi
if [ "${MATH_CANONICAL}" = "1" ] && [ "${DOMAIN}" = "math" ]; then
  EVAL_VAL_ARGS+=(--math-canonical-metric)
fi
python -m evaluation.eval_generator_qa "${EVAL_VAL_ARGS[@]}"
