# `js_reduce_object_index_builder` Build Plan

## Goal

Establish whether a micro-specialist can beat the base code model on a narrow reduce-based object-index contract.

## Phase 1

- synthetic dataset builder
- high-precision router
- JS verifier
- base-model baseline

## Promotion gate

Keep the contract only if a later treatment can deliver:

- `>= +0.10` absolute verified pass-rate lift, or
- `>= 25%` relative error reduction

against the exact same verifier and contract.
