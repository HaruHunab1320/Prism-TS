#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

python -m lumina_micro_specialists.data.build_js_reduce_accumulator_refactor_dataset \
  --output-dir lumina_micro_specialists/data/datasets/js_reduce_accumulator_refactor_v1 \
  --train-size 320 \
  --val-size 64
