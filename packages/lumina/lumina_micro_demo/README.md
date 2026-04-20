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
- one demo script that shows decomposition, routing, confidence, and final code

Active documents:
- `notes/final_push_plan.md`
- `notes/local_runtime_architecture.md`
- `notes/demo_flow.md`

Current scaffold:
- `runtime/schema.py` - execution trace types
- `runtime/planner.py` - block extraction from JavaScript source
- `runtime/router.py` - rules-first routing across the 3 promoted contracts
- `runtime/orchestrator.py` - builds the route/planning trace
- `run_demo_trace.py` - CLI entrypoint

Run the current route/planning demo:

```bash
bash lumina_micro_demo/tools/run_demo_trace.sh
```

Override prompt or input file:

```bash
LUMINA_MICRO_DEMO_PROMPT="Refactor this JavaScript into more idiomatic functional code." \
LUMINA_MICRO_DEMO_INPUT="path/to/input.js" \
bash lumina_micro_demo/tools/run_demo_trace.sh
```
