# Lumina Micro Standalone Dry Run

This directory is a dry-run split plan for a standalone shareable repo.

It is not a second implementation.
It is the extraction plan and target structure for the public-facing version of the current micro-specialist work.

## Why this exists

The current `packages/lumina` repo contains:

- validated micro-specialist research
- the packaged local demo
- older Lumina research history
- unrelated work that a reader does not need to understand the current result

The standalone repo should expose only the narrow, defensible artifact:

- three frozen JavaScript micro-specialists
- verifier-backed routing and local demo runtime
- paper + appendix + case gallery
- benchmark and demo artifacts

## Intended public claim

The standalone repo should support this claim:

> A verifier-backed local code transformation runtime where narrow contract specialists improve pass rates and confidence-gated acceptance enables high-precision rewrites.

It should not present itself as:

- a general specialist-routing AI system
- a universal confidence framework
- a broad local coding agent

## Key docs

- `standalone_manifest.md`
- `docs/repo_shape.md`
- `docs/export_mapping.md`
- `scripts/assemble_standalone.sh`

## Status

This is only the prep surface.

The current source-of-truth implementations still live in:

- `lumina_micro_demo/`
- `lumina_micro_specialists/`

Important boundary:

- the dry-run assembly proves the file surface
- it does not yet rewrite imports for a fully independent repo
- so this prep work is about extraction discipline, not a finished standalone package
