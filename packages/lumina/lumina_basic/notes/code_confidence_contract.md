# Code Confidence Contract

This note defines the first `lumina_basic` code contract.

Scope:

- domain: `code`
- language: `python`
- task type: short synthesis only
- correctness: execution-aware benchmark pass/fail

This is the code analogue of the validated math contract.

## Goal

Test whether a model can emit a useful correctness estimate for generated code.

Core question:

- can we estimate `P(code passes tests | prompt, model state, produced code)` well
  enough to support selective answering or escalation?

## Task contract

- input:
  - short Python programming prompt
- output:
  - Python code only
  - ideally a function body or complete function depending on benchmark task
  - when the benchmark expects a named callable, the output contract includes
    that exact symbol name
- correctness:
  - benchmark tests pass

Current benchmark scope:

- `MBPP`
- `HumanEval`

Fixtures already live in:

- `lumina_multimodel/benchmarks/code_exec/mbpp_test.jsonl`
- `lumina_multimodel/benchmarks/code_exec/humaneval_test.jsonl`

## Confidence definition

For this contract:

- `answer_confidence = P(submitted code passes the benchmark tests | prompt, model state, produced code)`

This is not:

- lexical similarity
- code fluency
- syntax-validity alone
- generic model certainty

## First baseline

The first baseline should be narrow and simple:

- one code-native model path
- one decoding contract
- execution-aware evaluation
- no multimodel routing
- no patch / edit tasks

Current promoted decode contract:

- strict code-only prompt
- benchmark-aware function-name alignment
- code-region extraction before execution

## Required metrics

Minimum metrics for the first code baseline:

- `pass_rate`
- `syntax_valid_rate`
- `answer_confidence` summary
- `AUROC` of confidence vs pass/fail
- `ECE`
- `Brier`
- `risk_coverage`
- `threshold_sweep`

## Allowed control modes

Not all of these are validated yet, but the contract should leave room for:

- `baseline_selective`
- `escalation_selective`

For the first baseline, we only need to measure whether confidence tracks pass/fail.

## What counts as a pass

The first code-confidence gate should only pass if:

- confidence ranks pass/fail materially better than random
- execution-aware metrics are stable enough to support thresholded policies

If confidence does not separate pass/fail, stop there and fix the code model
path before inventing control logic.
