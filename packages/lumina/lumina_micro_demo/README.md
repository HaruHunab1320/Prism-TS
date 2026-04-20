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
