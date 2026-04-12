#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

: "${LUMINA_MICRO_MODEL:=Qwen/Qwen2.5-Coder-1.5B-Instruct}"
: "${LUMINA_MICRO_SOURCE:=target}"

python -m lumina_micro_specialists.evaluation.eval_js_array_loop_to_map \
  --dataset lumina_micro_specialists/data/datasets/js_array_loop_to_map_v1/val.jsonl \
  --candidate-source "${LUMINA_MICRO_SOURCE}" \
  --model "${LUMINA_MICRO_MODEL}" \
  --max-samples 32 \
  --output-json lumina_micro_specialists/notes/js_array_loop_to_map_baseline_latest.json
