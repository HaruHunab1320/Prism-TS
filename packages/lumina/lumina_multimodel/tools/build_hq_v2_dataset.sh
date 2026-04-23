#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-}"
if [ -z "$NVME_ROOT" ]; then
  echo "Set LUMINA_NVME_ROOT (example: /Volumes/ROCKET-nano/lumina_multimodel)."
  exit 1
fi

OUT_NAME="${OUT_NAME:-datasets_hq_v2_curated}"

python data/ingest_hq_v2_datasets.py \
  --out "$OUT_NAME" \
  --with-codealpaca \
  --with-metamath \
  --metamath-limit "${METAMATH_LIMIT:-10000}" \
  "$@"

OUT_DIR="$ROOT_DIR/$OUT_NAME"
if [ -d "$OUT_DIR" ]; then
  rm -rf "$NVME_ROOT/$OUT_NAME"
  cp -a "$OUT_DIR" "$NVME_ROOT/$OUT_NAME"
  echo "Copied dataset to $NVME_ROOT/$OUT_NAME"
fi
