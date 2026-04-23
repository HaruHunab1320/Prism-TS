# Lumina Basic Reset Plan (2026-03-27)

## Why reset

The multimodel branch validated infrastructure and routing, but it did not validate
the original Lumina thesis:

- routing is strong enough
- confidence blending did not improve decisions
- disagreement utility was not usable in the current specialist regime
- generator quality did not improve materially under the current training approach

The active question is no longer "how do we tune the multimodel stack?".
It is:

- can a model produce a signal that predicts answer correctness well enough to
  control abstain or escalate decisions?

That is the original Lumina question in a smaller and testable form.

## What to keep

- multimodel router results as archived evidence
- cloud experiment infrastructure
- execution-aware code evaluation
- the confidence decomposition in `CONFIDENCE_DEFINITIONS.md`

## What to stop

- multimodel confidence blending work
- selector work on the current weak specialist pool
- disagreement/escalation experiments on the current multimodel stack
- more small ablations on prompt style, decode budget, or shallow dataset churn

## Reset scope

Use `lumina_basic` as the active path.

The first target is a single-model confidence system with one domain and one
objective correctness regime.

Recommended domain order:

1. `math`
2. `code`

Do not restart with multimodel routing.

## Core thesis to test

For a single model:

- produce an answer
- produce an answer-confidence signal
- optionally produce an escalation signal

Then test whether that signal improves control decisions:

- answer
- abstain
- escalate to extra compute

If confidence does not improve a decision here, it should not be trusted as the
foundation for a larger Lumina architecture.

## Phase A: Single-model confidence baseline

### Objective

Determine whether a single model can produce a useful answer-confidence signal.

### Minimal setup

- one modern open model family already compatible with the repo flow
- one domain (`math` first)
- one canonical dataset/eval contract
- one confidence head or correctness head

### Metrics

- task accuracy / EM / F1
- ECE
- Brier score
- AUROC of confidence vs correctness
- risk-coverage curve

### Pass gate

Confidence must separate correct from incorrect answers materially enough to
improve selective answering over a no-confidence baseline.

### Fail interpretation

If this fails, the Lumina thesis needs refinement before any multimodel work.

## Phase B: Control-action validation

### Objective

Test whether confidence improves a real decision, not just metadata quality.

### Policies to compare

- always answer
- abstain below threshold
- escalate below threshold with extra compute / second pass

### Metrics

- selective accuracy
- coverage
- abstain precision
- escalation lift on the hard subset

### Pass gate

At least one confidence-driven policy must outperform always-answer on a fixed
coverage or compute budget.

## Phase C: Only then consider branching

Branching or disagreement logic should only be revisited if:

- single-model confidence is useful
- escalation on low-confidence cases adds value

If those conditions are absent, branching is architecture theater.

## Two-week execution plan

### Week 1

- freeze one model + one math contract
- train/evaluate confidence or correctness head
- measure calibration and risk-coverage

### Week 2

- test abstain and escalation policies
- decide whether Lumina confidence is viable in single-model form

## Hard rules

- one canonical benchmark per phase
- one variable changed per run
- no fallback data mixes inside an experiment
- no multimodel work until single-model confidence shows value

## Decision rule

If single-model confidence works:

- keep `lumina_basic` as the active research path
- only later reintroduce specialists with a much narrower purpose

If single-model confidence does not work:

- pause Lumina architecture work
- reformulate the theory before more engineering
