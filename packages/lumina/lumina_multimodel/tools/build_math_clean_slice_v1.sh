#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-/Volumes/ROCKET-nano/lumina_multimodel}"
IN_ROOT="${IN_ROOT:-$NVME_ROOT/datasets_hq_med_distill_v1}"
OUT_ROOT="${OUT_ROOT:-$NVME_ROOT/datasets_math_clean_v1}"
MAX_TRAIN="${MAX_TRAIN:-0}"
MAX_VAL="${MAX_VAL:-0}"

python data/build_math_clean_slice.py \
  --in-root "$IN_ROOT" \
  --out-root "$OUT_ROOT" \
  --max-train "$MAX_TRAIN" \
  --max-val "$MAX_VAL"
