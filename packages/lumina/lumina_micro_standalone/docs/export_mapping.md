# Export Mapping

This maps current source paths to standalone targets.

## Demo runtime

- `lumina_micro_demo/runtime/*` -> `runtime/`
- `lumina_micro_demo/run_demo_present.py` -> `demo/run_demo_present.py`
- `lumina_micro_demo/run_demo_trace.py` -> `demo/run_demo_trace.py`
- `lumina_micro_demo/run_demo_view.py` -> `demo/run_demo_view.py`
- `lumina_micro_demo/bench_demo.py` -> `demo/bench_demo.py`

## Shell entrypoints

- `lumina_micro_demo/tools/run_demo_present.sh` -> `tools/run_demo_present.sh`
- `lumina_micro_demo/tools/run_demo_trace.sh` -> `tools/run_demo_trace.sh`
- `lumina_micro_demo/tools/run_demo_view.sh` -> `tools/run_demo_view.sh`
- `lumina_micro_demo/tools/run_bench_demo.sh` -> `tools/run_bench_demo.sh`

## Contracts / verifiers

- `lumina_micro_specialists/runtime/router_js_array_loop_to_map.py` -> `contracts/router_js_array_loop_to_map.py`
- `lumina_micro_specialists/runtime/router_js_reduce_accumulator_refactor.py` -> `contracts/router_js_reduce_accumulator_refactor.py`
- `lumina_micro_specialists/runtime/router_js_reduce_object_index_builder.py` -> `contracts/router_js_reduce_object_index_builder.py`
- `lumina_micro_specialists/evaluation/verify_js_array_loop_to_map.py` -> `verifiers/verify_js_array_loop_to_map.py`
- `lumina_micro_specialists/evaluation/verify_js_reduce_accumulator_refactor.py` -> `verifiers/verify_js_reduce_accumulator_refactor.py`
- `lumina_micro_specialists/evaluation/verify_js_reduce_object_index_builder.py` -> `verifiers/verify_js_reduce_object_index_builder.py`

## Data builders

- `lumina_micro_specialists/data/build_js_array_loop_to_map_dataset.py` -> `data_builders/build_js_array_loop_to_map_dataset.py`
- `lumina_micro_specialists/data/build_js_reduce_accumulator_refactor_dataset.py` -> `data_builders/build_js_reduce_accumulator_refactor_dataset.py`
- `lumina_micro_specialists/data/build_js_reduce_object_index_builder_dataset.py` -> `data_builders/build_js_reduce_object_index_builder_dataset.py`

## Paper

- `lumina_micro_demo/paper/*` -> `paper/`

## Artifacts

- `lumina_micro_demo/final_bundle/artifacts/*` -> `artifacts/`
