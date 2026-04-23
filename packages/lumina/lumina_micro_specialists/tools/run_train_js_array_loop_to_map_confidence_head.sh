#!/usr/bin/env bash
set -euo pipefail

MODEL="${LUMINA_MICRO_MODEL:-Qwen/Qwen2.5-Coder-1.5B-Instruct}"

python -m lumina_micro_specialists.training.train_js_array_loop_to_map_confidence_head \
  --train-dataset lumina_micro_specialists/data/datasets/js_array_loop_to_map_v1/train.jsonl \
  --val-dataset lumina_micro_specialists/data/datasets/js_array_loop_to_map_v1/val.jsonl \
  --model "$MODEL" \
  --max-train-samples "${LUMINA_MICRO_TRAIN_SAMPLES:-256}" \
  --max-val-samples "${LUMINA_MICRO_VAL_SAMPLES:-64}" \
  --output lumina_micro_specialists/outputs/js_array_loop_to_map_confidence_probe.pt \
  --metrics-json lumina_micro_specialists/notes/js_array_loop_to_map_confidence_probe_latest.json
