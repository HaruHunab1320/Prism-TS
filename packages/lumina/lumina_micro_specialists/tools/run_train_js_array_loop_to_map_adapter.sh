#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

: "${LUMINA_MICRO_MODEL:=Qwen/Qwen2.5-Coder-1.5B-Instruct}"

python -m lumina_micro_specialists.training.train_js_array_loop_to_map_adapter \
  --data-root lumina_micro_specialists/data/datasets/js_array_loop_to_map_v1 \
  --model-name "${LUMINA_MICRO_MODEL}" \
  --epochs 2 \
  --batch-size 2 \
  --lr 8e-6 \
  --max-len 384 \
  --max-train-samples 320 \
  --max-val-samples 64 \
  --unfreeze-n 2 \
  --output-dir lumina_micro_specialists/outputs \
  --metrics-json lumina_micro_specialists/notes/js_array_loop_to_map_train_latest.json
