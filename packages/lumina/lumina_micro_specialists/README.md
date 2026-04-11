# Lumina Micro-Specialists

This workspace is for narrow, contract-matched specialists.

The goal is not "code" or "math" in general. The goal is one small task that:

- has a precise input/output contract
- is cheap to verify
- can be routed with high precision
- can fall back cleanly when outside scope

## First vertical slice

- contract: `js_array_loop_to_map`
- domain: JavaScript refactoring
- task: convert a simple imperative array transform loop into `.map`

See:

- `notes/js_array_loop_to_map_contract.md`
- `notes/js_array_loop_to_map_flow.md`
- `notes/js_array_loop_to_map_build_plan.md`
- `notes/micro_specialist_program.md`

## Why this path

Broad specialists like `code`, `math`, and `general` were still too wide.

Micro-specialists are intended to be:

- easier to train well
- easier to evaluate rigorously
- easier to route safely
- easier to attach confidence/control behavior to

## Planned structure

- `notes/`
  - contract specs
  - routing rules
  - verifier design
  - end-to-end flow notes
- `data/`
  - narrow contract-matched datasets
- `evaluation/`
  - verifier and contract-specific evaluation
- `training/`
  - adapter or LoRA training for the narrow contract
- `runtime/`
  - router + specialist + verifier + fallback path

## Working rule

Each micro-specialist must prove one thing:

- under its contract, it beats the base model strongly enough to justify the
  extra routing and control complexity
