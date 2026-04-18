#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
LUMINA_MICRO_SOURCE="${LUMINA_MICRO_SOURCE:-target}"
LUMINA_MICRO_MODEL="${LUMINA_MICRO_MODEL:-Qwen/Qwen2.5-Coder-1.5B-Instruct}"
python -m lumina_micro_specialists.evaluation.eval_js_reduce_object_index_builder \
  --dataset lumina_micro_specialists/data/datasets/js_reduce_object_index_builder_v1/val.jsonl \
  --candidate-source "$LUMINA_MICRO_SOURCE" \
  --model "$LUMINA_MICRO_MODEL" \
  --max-samples 64 \
  --output-json lumina_micro_specialists/notes/js_reduce_object_index_builder_model_baseline_latest.json
