#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-}"
if [ -z "$NVME_ROOT" ]; then
  echo "Set LUMINA_NVME_ROOT (example: /Volumes/ROCKET-nano/lumina_multimodel)."
  exit 1
fi

BASE_ROOT="${BASE_ROOT:-$NVME_ROOT/datasets_hq_med_clean_v1}"
TEACHER_ROOT="${TEACHER_ROOT:-$NVME_ROOT/datasets_teacher_v1}"
OUT_ROOT="${OUT_ROOT:-$NVME_ROOT/datasets_hq_med_distill_v1}"
MAX_TEACHER_TRAIN="${MAX_TEACHER_TRAIN:-20000}"
MAX_BASE_TRAIN="${MAX_BASE_TRAIN:-0}"
TEACHER_WEIGHT="${TEACHER_WEIGHT:-1.5}"
SEED="${SEED:-42}"

python data/prepare_distill_dataset.py \
  --base-root "$BASE_ROOT" \
  --teacher-root "$TEACHER_ROOT" \
  --out-root "$OUT_ROOT" \
  --max-teacher-train "$MAX_TEACHER_TRAIN" \
  --max-base-train "$MAX_BASE_TRAIN" \
  --teacher-weight "$TEACHER_WEIGHT" \
  --seed "$SEED"
