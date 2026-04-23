# Specialist Rebuild Plan

Last updated: 2026-03-24

## Goal

Stop running mixed, ambiguous specialist experiments.

Define:
- a clear contract per domain
- a matching evaluation path per domain
- a dataset built to that contract
- one clean training variable per experiment

## Current baseline to keep fixed

Frozen plain baseline:
- route `~0.993`
- F1 `~0.080-0.081`
- task `~0.139-0.140`
- success@0.7 `~0.101-0.102`

Do not change for the next phase:
- router
- confidence blending
- top-2 selection logic
- prompt tricks in the aggregator

## Core diagnosis

The remaining bottleneck is upstream specialist construction.

What recent ablations ruled out:
- prompt-contract alignment at inference only -> worse
- code decode-budget increase at inference only -> worse
- simple metadata chooser -> worse
- current confidence blending -> no gain

What remains:
- specialist task contracts are underspecified
- code evaluation is misaligned
- current adaptation recipe is too shallow to tell us much
- dataset changes are not yet being tested against a strict contract

## Domain contracts

### General

Contract:
- short factual answer
- ideally `1-12` words
- no rationale
- no multi-part explanation

Primary metric:
- EM / token F1

Secondary metric:
- calibration/selective accuracy later, not now

Suitable sources:
- short-answer QA
- grounded factual QA
- verified extractive/abstractive short-answer data

### Math

Contract:
- exact final answer only
- numeric or short symbolic form
- no chain-of-thought target

Primary metric:
- exact final-answer match

Secondary metric:
- normalized numeric match

Suitable sources:
- GSM8K-style exact-answer data
- curated verifiable symbolic / algebraic final-answer sets

### Code

Contract:
- full function or executable code snippet
- not prose
- not conceptual explanation
- not mixed “explain + code” output

Primary metric:
- execution-aware pass rate

Secondary metrics:
- lexical similarity only as debugging support

Suitable sources:
- MBPP
- HumanEval
- code instruction sets where the answer is actual code
- edit/repair sets only if we define a separate patch/edit contract

## Immediate design decision

Code needs to split into one of these:

1. `code_generate`
- output is a function/snippet
- evaluated by tests

2. `code_edit`
- output is a patch or full revised file
- evaluated by diff/task-specific checks

We should not keep mixing both in one specialist until the contract is explicit.

Recommended first choice:
- `code_generate`

Reason:
- easiest to evaluate cleanly with MBPP/HumanEval-style pass@k/pass@1 logic
- closest to the data we already have

## Eval redesign

### Keep as-is
- general EM/F1
- math exact-answer metric

### Must change
- code eval

Required for code:
- create a code eval that runs test cases where available
- report:
  - `pass_rate`
  - `syntax_valid_rate`
  - optional text F1 only as a debugging metric

Until this exists:
- do not interpret code dataset/model changes as strong evidence

## Dataset rebuild rules

Apply to every future dataset rebuild:

1. One domain at a time
2. No fallbacks in the experiment itself
3. Every source capped
4. Exact source counts logged
5. Exact filtering rules logged
6. Output contract enforced in the builder
7. Eval contract matches target contract

## Recommended next datasets

### General vNext

Keep focused on short factual QA:
- high-quality short-answer QA only
- avoid broad chat/instruction mixtures for now

Target:
- stable short-answer specialist, not a general chat assistant

### Math vNext

Keep focused on exact-answer math:
- verifiable final-answer tasks only
- broader coverage than current set is fine
- do not train on long rationale unless the target still reduces to exact answer

Target:
- exact-answer specialist, not general reasoning theater

### Code vNext

First real rebuild should be for `code_generate` only:
- MBPP
- HumanEval
- filtered code instruction data where outputs are executable code
- no prose-only samples
- no mixed explanation targets

Target:
- a smaller, cleaner executable dataset beats a larger noisy one

## Training changes to test cleanly

Do not change everything at once.

Ordered test priority:

1. adaptation method
- current: last `n=2` blocks + lm_head
- next clean test: stronger adapter or wider unfreeze

2. data contract
- cleaner dataset to the fixed contract

3. model family
- only after 1 and 2 are controlled

## Next 2 experiments

### Experiment 1: Code eval contract

Objective:
- make code measurable in a meaningful way

Deliverables:
- `evaluation/eval_code_exec.py`
- reads code rows with tests where available
- reports `pass_rate`, `syntax_valid_rate`, optional text F1

Pass condition:
- we can score current promoted code specialist and any new code specialist under the same executable metric

### Experiment 2: Code generate rebuild

Objective:
- build the first clean code specialist experiment

Fixed:
- router
- aggregator
- prompts

Changes:
- dataset built only for `code_generate`
- stronger adaptation recipe than current shallow setup
- evaluated with executable code metric first, aggregator second

Pass condition:
- meaningful improvement on code execution metric
- then check whether any of that propagates end-to-end

## What not to do

- no more prompt-only fixes
- no more decode-budget-only fixes
- no more fallback datasets inside the main hypothesis test
- no more code conclusions from text F1 alone
- no more mixed “code generation + explanation + edit” datasets in one specialist

## Recommendation

The next correct move is:

1. build execution-aware code evaluation
2. define `code_generate` as the contract
3. rebuild the code dataset only to that contract
4. run one clean stronger-training experiment against the frozen baseline

That is the shortest path that actually teaches us something new.
