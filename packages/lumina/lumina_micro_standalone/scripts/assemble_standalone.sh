#!/usr/bin/env bash
set -euo pipefail

# Dry-run assembly script for the future standalone repo split.
# This does not publish anything. It just documents the copy surface in one place.

ROOT=${1:-/tmp/lumina-micro-standalone}

mkdir -p \
  "$ROOT/runtime" \
  "$ROOT/demo" \
  "$ROOT/tools" \
  "$ROOT/examples" \
  "$ROOT/contracts" \
  "$ROOT/verifiers" \
  "$ROOT/data_builders" \
  "$ROOT/paper" \
  "$ROOT/artifacts"

cp -R lumina_micro_demo/runtime/. "$ROOT/runtime/"
cp lumina_micro_demo/run_demo_present.py "$ROOT/demo/"
cp lumina_micro_demo/run_demo_trace.py "$ROOT/demo/"
cp lumina_micro_demo/run_demo_view.py "$ROOT/demo/"
cp lumina_micro_demo/bench_demo.py "$ROOT/demo/"

cp lumina_micro_demo/tools/run_demo_present.sh "$ROOT/tools/"
cp lumina_micro_demo/tools/run_demo_trace.sh "$ROOT/tools/"
cp lumina_micro_demo/tools/run_demo_view.sh "$ROOT/tools/"
cp lumina_micro_demo/tools/run_bench_demo.sh "$ROOT/tools/"

cp lumina_micro_demo/examples/multi_transform_input.js "$ROOT/examples/"

cp lumina_micro_specialists/runtime/router_js_array_loop_to_map.py "$ROOT/contracts/"
cp lumina_micro_specialists/runtime/router_js_reduce_accumulator_refactor.py "$ROOT/contracts/"
cp lumina_micro_specialists/runtime/router_js_reduce_object_index_builder.py "$ROOT/contracts/"

cp lumina_micro_specialists/evaluation/verify_js_array_loop_to_map.py "$ROOT/verifiers/"
cp lumina_micro_specialists/evaluation/verify_js_reduce_accumulator_refactor.py "$ROOT/verifiers/"
cp lumina_micro_specialists/evaluation/verify_js_reduce_object_index_builder.py "$ROOT/verifiers/"

cp lumina_micro_specialists/data/build_js_array_loop_to_map_dataset.py "$ROOT/data_builders/"
cp lumina_micro_specialists/data/build_js_reduce_accumulator_refactor_dataset.py "$ROOT/data_builders/"
cp lumina_micro_specialists/data/build_js_reduce_object_index_builder_dataset.py "$ROOT/data_builders/"

cp lumina_micro_demo/paper/*.md "$ROOT/paper/"
cp lumina_micro_demo/final_bundle/artifacts/* "$ROOT/artifacts/"

echo "Standalone dry-run assembled at: $ROOT"
