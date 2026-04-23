# Standalone Manifest

## Goal

Define the exact export set for a standalone `lumina-micro` style repo so the split is deliberate rather than ad hoc.

## Include

### 1. Demo runtime

Source:

- `lumina_micro_demo/runtime/`
- `lumina_micro_demo/run_demo_present.py`
- `lumina_micro_demo/run_demo_trace.py`
- `lumina_micro_demo/run_demo_view.py`
- `lumina_micro_demo/bench_demo.py`
- `lumina_micro_demo/tools/run_demo_present.sh`
- `lumina_micro_demo/tools/run_demo_trace.sh`
- `lumina_micro_demo/tools/run_demo_view.sh`
- `lumina_micro_demo/tools/run_bench_demo.sh`
- `lumina_micro_demo/examples/multi_transform_input.js`

Standalone destination:

- `runtime/`
- `demo/`
- `tools/`
- `examples/`

### 2. Contract routing + verification for the 3 promoted specialists

Source:

- `lumina_micro_specialists/runtime/router_js_array_loop_to_map.py`
- `lumina_micro_specialists/runtime/router_js_reduce_accumulator_refactor.py`
- `lumina_micro_specialists/runtime/router_js_reduce_object_index_builder.py`
- `lumina_micro_specialists/evaluation/verify_js_array_loop_to_map.py`
- `lumina_micro_specialists/evaluation/verify_js_reduce_accumulator_refactor.py`
- `lumina_micro_specialists/evaluation/verify_js_reduce_object_index_builder.py`

Standalone destination:

- `contracts/`
- `verifiers/`

### 3. Dataset builders for reproducibility

Source:

- `lumina_micro_specialists/data/build_js_array_loop_to_map_dataset.py`
- `lumina_micro_specialists/data/build_js_reduce_accumulator_refactor_dataset.py`
- `lumina_micro_specialists/data/build_js_reduce_object_index_builder_dataset.py`

Standalone destination:

- `data_builders/`

### 4. Paper + audit docs

Source:

- `lumina_micro_demo/paper/research_note.md`
- `lumina_micro_demo/paper/appendix_methods.md`
- `lumina_micro_demo/paper/results_table.md`
- `lumina_micro_demo/paper/case_gallery.md`

Standalone destination:

- `paper/`

### 5. Packaged artifacts

Source:

- `lumina_micro_demo/final_bundle/artifacts/demo_input.js`
- `lumina_micro_demo/final_bundle/artifacts/mock_demo_output.txt`
- `lumina_micro_demo/final_bundle/artifacts/ollama_demo_output.txt`
- `lumina_micro_demo/final_bundle/artifacts/ollama_benchmark.json`

Standalone destination:

- `artifacts/`

## Exclude

Do not move these into the public standalone repo:

- `lumina_basic/`
- old multimodel experiments
- archived cloud experiment churn
- `lumina_multimodel/tools/cloud/archive/`
- unrelated Prism work
- stale notes and generated `*_latest.json`
- dropped micro-specialist candidates like `js_filter_predicate_refactor`

## Public repo success criteria

The standalone repo is good enough when someone can:

1. understand the claim from the root README
2. run the demo locally
3. inspect the research note + audit appendix
4. understand the three contracts and their limits
5. see example outputs and benchmark numbers

## Open technical gap

The standalone repo can ship before true adapter swapping exists, but it must say so clearly.

Current demo status:

- real local runtime
- verifier-backed control
- single Ollama backend
- adapter-shaped architecture, not adapter-loaded runtime

## Dry-run status

The dry-run assembly script copies the right files into a standalone layout, but the result is not yet fully runnable as an independent repo because some module imports still reference the current monorepo paths.

So the next real split step would be:

1. copy the distilled surface
2. rewrite imports to the new standalone package structure
3. run the demo and benchmark from the new root
