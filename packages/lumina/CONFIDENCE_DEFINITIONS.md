# Lumina Confidence Definitions

## Purpose
This document tightens the theoretical meaning of "confidence" in Lumina.

The key correction is simple:

- confidence is not a model feeling
- confidence is not one scalar
- confidence is a control signal used to choose the next computational action

If we do not separate the different control signals, the architecture becomes hard to test and easy to misread.

## Core Reframe

Lumina should not be defined as "a model that outputs confidence."

Lumina should be defined as:

- an uncertainty-aware control architecture
- where routing, answering, abstaining, escalating, and branching are driven by explicit, testable decision signals

The job of a confidence-related signal is not to look intuitive. The job is to improve control decisions over a strong plain baseline.

## The Problem With A Single Confidence Scalar

The word `confidence` often gets used to mean all of the following:

- how likely the router thinks a domain is correct
- how likely a specialist answer is correct
- how familiar the input is
- how ambiguous the task is
- whether more compute would help
- whether disagreement is meaningful rather than noise

Those are different variables.

Collapsing them into one scalar makes the system difficult to calibrate and nearly impossible to interpret. It also causes false conclusions during evaluation, because improvements in one layer do not necessarily transfer to another.

## The Four Signals Lumina Actually Needs

### 1. Routing confidence

Question:
- which specialist should get this query?

Definition:
- a comparative score over candidate specialists for input `x`

Interpretation:
- this is about domain assignment, not answer correctness

Used for:
- top-1 routing
- top-K routing
- fallback routing

Good test:
- route accuracy
- top-K recall
- confusion structure across domains

### 2. Answer confidence

Question:
- given a specialist answer, how likely is it to be correct?

Definition:
- a post-answer or answer-conditioned estimate of correctness

Interpretation:
- this is not the same as routing confidence
- a router can be right and the answer still be wrong

Used for:
- answer ranking
- abstention
- answer selection among multiple candidates

Good test:
- calibration curves
- selective accuracy at matched coverage
- false-confident error rate

### 3. Escalation value

Question:
- if we spend more compute, is improvement likely?

Definition:
- an estimate of the expected value of deeper computation for this case

Interpretation:
- low answer confidence does not always imply that escalation is useful
- some cases are uncertain but recoverable
- some cases are uncertain and hopeless

Used for:
- deciding whether to ask another specialist
- deciding whether to extend context
- deciding whether to run a second-pass adjudicator
- deciding whether to stop

Good test:
- uplift from extra compute on flagged cases
- cost-adjusted improvement on hard subsets

### 4. Disagreement significance

Question:
- when two competent candidates disagree, is that disagreement informative?

Definition:
- an estimate of whether disagreement reflects complementary expertise or shared confusion

Interpretation:
- this is the heart of the Lumina thesis
- disagreement only becomes useful when candidate systems are sufficiently diverse and individually competent

Used for:
- triggering adjudication
- triggering deeper branching
- deciding whether contradiction is signal or noise

Good test:
- improvement from escalate-on-disagreement over direct-answer baseline
- quality on the disagreement subset

## What Counts As Confidence In Lumina

The most useful operational definition is:

- confidence is any signal that improves the choice among:
  - answer now
  - abstain
  - route elsewhere
  - ask another expert
  - spend more compute
  - stop branching
  - continue branching

If a signal does not improve one of those control decisions, it is not useful confidence for Lumina, even if it looks psychologically plausible.

## Uncertainty Types Still Matter

The epistemic / aleatoric / distribution-shift split still has value, but it should be treated as supporting structure, not as the whole theory.

- epistemic:
  - lack of knowledge or lack of fit
  - may improve with more data or another specialist

- aleatoric:
  - inherent ambiguity in the input or task
  - more compute may not help much

- distribution shift:
  - input is outside the operating region
  - routing or abstention may be better than deeper answering

These should inform answer confidence and escalation value, but they are not interchangeable with either.

## A Better Statement Of The Lumina Thesis

The weaker version:

- models should emit calibrated confidence

The stronger and better version:

- uncertainty-aware control signals should improve routing, abstention, escalation, and disagreement handling beyond a strong non-Lumina baseline

This is what the experiments should test.

## What Must Be Proven For "Full Lumina"

Lumina is not validated when a model emits a confidence score.

Lumina is validated only if all of the following hold:

1. Routing confidence improves specialist selection over simple baselines.
2. Answer confidence improves selection or abstention at matched coverage.
3. Escalation value identifies cases where extra compute is actually worthwhile.
4. Disagreement significance identifies hard cases where extra reasoning beats direct answering.
5. Branching logic improves difficult-case performance without unreasonable compute blowup.

If those do not hold, then the architecture is still a useful routed system, but not yet full Lumina.

## Immediate Experimental Consequences

### Current interpretation of recent results

- Routing confidence has shown real value.
- Answer confidence has not yet shown clear incremental value in the current regime.
- Disagreement significance has not yet been tested cleanly.
- Branching should not be treated as validated or even prioritized until disagreement utility is proven.

### Correct experimental order

1. freeze strongest plain baseline
2. improve specialist quality
3. retrain and test answer confidence utility
4. test disagreement-triggered escalation
5. only then test true branching behavior

## Design Implication

Future interfaces should stop overloading one field named `confidence`.

Preferred interface shape:

```json
{
  "routing_confidence": 0.0,
  "answer_confidence": 0.0,
  "escalation_value": 0.0,
  "disagreement_significance": 0.0,
  "uncertainty": {
    "epistemic": 0.0,
    "aleatoric": 0.0,
    "distribution_shift": 0.0
  }
}
```

Not every component has to emit all fields immediately. But the theory should distinguish them now, even if implementation arrives in stages.

## Bottom Line

The Lumina thesis still has merit.

The main theoretical weakness was not the idea of confidence-aware computation itself. The weakness was treating `confidence` as a single undifferentiated scalar instead of a family of control signals with distinct roles.
