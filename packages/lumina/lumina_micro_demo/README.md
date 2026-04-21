# Lumina Micro Demo

This workspace is the final push for the local micro-specialist demo.

Scope:
- shared-base runtime, not separate full checkpoints
- one local base code model
- contract-specific adapters/deltas
- tiny confidence heads
- verifier-backed routing and fallback

Inputs:
- the three frozen JS specialists from `lumina_micro_specialists/`

Outputs:
- one local orchestration path that goes from user prompt to verified response
- one demo script that shows decomposition, routing, confidence, verification, and final code

Active documents:
- `notes/final_push_plan.md`
- `notes/local_runtime_architecture.md`
- `notes/demo_flow.md`

Current scaffold:
- `runtime/schema.py` - execution trace types
- `runtime/planner.py` - block extraction from JavaScript source
- `runtime/router.py` - rules-first routing across the 3 promoted contracts
- `runtime/specialists.py` - specialist backend interface and shared-base-oriented backend metadata
- `runtime/executor.py` - verifier-row synthesis and mock execution helpers
- `runtime/orchestrator.py` - builds the full demo trace, threshold gating, and composed output
- `run_demo_trace.py` - raw JSON trace CLI
- `run_demo_view.py` - readable demo view
- `bench_demo.py` - local cold/warm latency benchmark harness

Validated local backends:
- `mock`
- `ollama` using `llama3.1:latest`

Run the readable demo:

```bash
bash lumina_micro_demo/tools/run_demo_view.sh
```

Run the raw JSON trace:

```bash
bash lumina_micro_demo/tools/run_demo_trace.sh
```


Use the local Ollama backend:

```bash
LUMINA_MICRO_DEMO_BACKEND=ollama \
LUMINA_MICRO_DEMO_OLLAMA_MODEL=llama3.1:latest \
LUMINA_MICRO_DEMO_OLLAMA_KEEPALIVE=5m \
bash lumina_micro_demo/tools/run_demo_view.sh
```


Run the local benchmark:

```bash
LUMINA_MICRO_DEMO_BACKEND=ollama \
LUMINA_MICRO_DEMO_OLLAMA_MODEL=llama3.1:latest \
LUMINA_MICRO_DEMO_OLLAMA_KEEPALIVE=5m \
LUMINA_MICRO_DEMO_ITERATIONS=3 \
LUMINA_MICRO_DEMO_COLD_FIRST=1 \
bash lumina_micro_demo/tools/run_bench_demo.sh
```
