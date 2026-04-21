#!/usr/bin/env bash
set -euo pipefail

PROMPT=${LUMINA_MICRO_DEMO_PROMPT:-"Refactor this JavaScript into more idiomatic functional code."}
INPUT=${LUMINA_MICRO_DEMO_INPUT:-"lumina_micro_demo/examples/multi_transform_input.js"}
BACKEND=${LUMINA_MICRO_DEMO_BACKEND:-mock}
OLLAMA_MODEL=${LUMINA_MICRO_DEMO_OLLAMA_MODEL:-llama3.1:latest}
OLLAMA_KEEPALIVE=${LUMINA_MICRO_DEMO_OLLAMA_KEEPALIVE:-5m}

python -m lumina_micro_demo.run_demo_view --prompt "$PROMPT" --input "$INPUT" --backend "$BACKEND" --ollama-model "$OLLAMA_MODEL" --ollama-keepalive "$OLLAMA_KEEPALIVE"
