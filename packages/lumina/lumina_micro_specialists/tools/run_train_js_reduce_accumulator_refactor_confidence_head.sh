#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

: "${LUMINA_MICRO_MODEL:=Qwen/Qwen2.5-Coder-1.5B-Instruct}"

python -m lumina_micro_specialists.training.train_js_reduce_accumulator_refactor_confidence_head \
  --train-dataset lumina_micro_specialists/data/datasets/js_reduce_accumulator_refactor_v1/train.jsonl \
  --val-dataset lumina_micro_specialists/data/datasets/js_reduce_accumulator_refactor_v1/val.jsonl \
  --model "${LUMINA_MICRO_MODEL}" \
  --max-train-samples 256 \
  --max-val-samples 64 \
  --max-new-tokens 96 \
  --output lumina_micro_specialists/outputs/js_reduce_accumulator_refactor_confidence_probe.pt \
  --metrics-json lumina_micro_specialists/notes/js_reduce_accumulator_refactor_confidence_probe_latest.json
