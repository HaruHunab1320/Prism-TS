#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

python -m lumina_micro_specialists.data.build_js_array_loop_to_map_dataset \
  --output-dir lumina_micro_specialists/data/datasets/js_array_loop_to_map_v1 \
  --train-size 320 \
  --val-size 64
