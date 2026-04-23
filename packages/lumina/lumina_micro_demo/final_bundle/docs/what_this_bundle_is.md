# What This Bundle Is

This bundle packages the current Lumina micro-specialist demo into one analyzable surface.

## Concept

Instead of asking one general model to solve the whole coding request at once, the system treats the request like a short execution pipeline:

- detect narrow transform steps
- route each step to a contract-specific specialist
- verify the rewrite
- keep it only if it passes verification and clears the confidence threshold

The current demo is intentionally narrow.

It focuses on three JavaScript loop refactor contracts:

- loop to `.map()`
- scalar accumulator loop to `.reduce()`
- object-index builder loop to `.reduce()`

## Methods

The research path behind this bundle used:

- synthetic contract-matched data
- executable verifiers instead of text-overlap scoring
- specialist answer-model uplift only where there was measurable headroom
- learned contract-specific confidence where pass/fail labels were meaningful
- fixed-threshold selective control after stability checks

The local runtime in this bundle uses the frozen contract thresholds and verifier-backed accept/fallback behavior.

## Result

The packaged demo now shows:

- prompt decomposition
- rules-first routing
- specialist execution
- verification
- confidence-threshold gating
- final composed output

And it runs locally through Ollama.

## Practical limitation

The local demo backend is still using one local model backend, not real adapter swapping.

So this bundle proves the runtime shape and the control behavior, not the final compact deployment architecture.
