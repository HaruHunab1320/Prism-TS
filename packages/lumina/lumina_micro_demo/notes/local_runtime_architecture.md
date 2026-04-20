# Local Runtime Architecture

## Deployment target

One local base model with hot-swappable specialist behavior.

## Shape

- shared base model
- one adapter/delta per contract
- one tiny confidence head per contract
- one verifier per contract
- one controller that decides accept or fallback

## Why this shape

The contracts are small, but the current research checkpoints are not.
A separate 1.5B checkpoint per micro-task is not the final product shape.

The runtime we want is:
- memory-efficient
- adapter-oriented
- credible on a Mac

## Runtime stages

1. prompt intake
2. code span extraction
3. contract routing
4. specialist execution
5. verifier check
6. confidence gate
7. final composition
