#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-/Volumes/ROCKET-nano/lumina_multimodel}"
IN_ROOT="${IN_ROOT:-$NVME_ROOT/datasets_hq_med_distill_v1}"
OUT_ROOT="${OUT_ROOT:-$NVME_ROOT/datasets_general_clean_v2}"

MAX_TRAIN="${MAX_TRAIN:-0}"
MAX_VAL="${MAX_VAL:-0}"
MIN_WORDS="${MIN_WORDS:-1}"
MAX_WORDS="${MAX_WORDS:-12}"

TEACHER_LIMIT_TRAIN="${TEACHER_LIMIT_TRAIN:-0}"
TEACHER_LIMIT_VAL="${TEACHER_LIMIT_VAL:-0}"
TEACHER_MAX_NEW_TOKENS="${TEACHER_MAX_NEW_TOKENS:-24}"

# Endpoint mode (recommended for Kimi) when TEACHER_ENDPOINT_URL is set.
TEACHER_ENDPOINT_URL="${TEACHER_ENDPOINT_URL:-}"
TEACHER_ENDPOINT_MODEL="${TEACHER_ENDPOINT_MODEL:-moonshotai/Kimi-K2-Instruct}"
TEACHER_API_KEY_ENV="${TEACHER_API_KEY_ENV:-MOONSHOT_API_KEY}"
TEACHER_TIMEOUT_S="${TEACHER_TIMEOUT_S:-60}"

# Local model mode fallback when TEACHER_MODEL is set and endpoint URL is empty.
TEACHER_MODEL="${TEACHER_MODEL:-}"
TEACHER_DEVICE="${TEACHER_DEVICE:-}"

args=(
  --in-root "$IN_ROOT"
  --out-root "$OUT_ROOT"
  --max-train "$MAX_TRAIN"
  --max-val "$MAX_VAL"
  --min-words "$MIN_WORDS"
  --max-words "$MAX_WORDS"
  --teacher-limit-train "$TEACHER_LIMIT_TRAIN"
  --teacher-limit-val "$TEACHER_LIMIT_VAL"
  --teacher-max-new-tokens "$TEACHER_MAX_NEW_TOKENS"
)

if [[ -n "$TEACHER_ENDPOINT_URL" ]]; then
  args+=(
    --teacher-endpoint-url "$TEACHER_ENDPOINT_URL"
    --teacher-endpoint-model "$TEACHER_ENDPOINT_MODEL"
    --teacher-api-key-env "$TEACHER_API_KEY_ENV"
    --teacher-timeout-s "$TEACHER_TIMEOUT_S"
  )
elif [[ -n "$TEACHER_MODEL" ]]; then
  args+=(
    --teacher-model "$TEACHER_MODEL"
    --teacher-device "$TEACHER_DEVICE"
  )
fi

python data/build_general_clean_slice.py "${args[@]}"
