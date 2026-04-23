# Lumina Grounding (Pre-Symbolic R&D)

This folder is reserved for a separate long-horizon experiment:
pre-symbolic "sensory-first" learning before language/task supervision.

## Why this exists

Current `lumina_multimodel` work is task-oriented (QA/routing/aggregation).
This track explores a different hypothesis:
- start with raw sensory structure (shape, color, position, motion, texture)
- learn by prediction/novelty/compression first
- layer symbolic meaning later

## Scope (initial)

- toy synthetic sensory environment
- self-supervised objective (next-state prediction + representation quality)
- no dependency on current multimodel training loop

## Status

Not started. Parked for later exploration.

## Suggested first milestones

1. Build synthetic generator for simple scenes (2D shapes, colors, transforms).
2. Train tiny world model to predict next frame/state.
3. Track novelty and representation stability metrics.
4. Add optional language labels only after latent structure is stable.
