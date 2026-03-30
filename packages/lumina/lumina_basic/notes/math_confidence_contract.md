# Math Confidence Contract

## Purpose

This is the first clean validation target for `lumina_basic`.

We are not trying to validate general intelligence or multimodel behavior here.
We are testing a narrower claim:

- can a single model produce an answer-confidence signal that predicts whether
  its final math answer is correct well enough to improve abstain or escalate
  decisions?

## Task scope

Domain:

- short, verifiable math QA

Initial task shape:

- arithmetic / word-problem style questions
- exact final-answer tasks
- no free-form proofs
- no chain-of-thought scoring

## Input contract

The model receives:

- one math question

Prompt shape should stay fixed for the whole phase.

Example:

```text
Question: If a train travels 60 miles in 1.5 hours, what is its average speed?
Answer:
```

## Output contract

The model must produce:

- one final answer

Preferred form:

- a short numeric or canonical symbolic answer

The model is not rewarded for long explanations in this phase.
If reasoning is used internally or in a second-pass escalation path, that is a
separate mechanism and not part of the correctness contract.

## Correctness contract

Ground truth is defined by normalized final-answer correctness only.

Correct:

- the normalized predicted final answer matches the normalized gold answer

Incorrect:

- any other output

Normalization rules should be explicit and stable:

- trim whitespace
- lowercase
- canonicalize numeric strings where safe
- optionally normalize simple equivalent numeric forms (`4`, `4.0`)

We are not scoring explanation quality in this phase.

## Confidence definition

For this phase:

- `confidence = P(final answer is correct | prompt, model state, produced answer)`

This is answer confidence, not a broad philosophical notion of certainty.

It is specifically:

- an actionable estimate of answer correctness

It is not:

- routing confidence
- disagreement significance
- escalation value
- confidence in writing quality
- confidence in hidden reasoning quality

## Confidence target

Training/eval target for confidence is binary:

- `1` if final answer is correct
- `0` if final answer is incorrect

This makes the first experiment clean:

- can the model distinguish its correct answers from its incorrect ones?

## Allowed control actions

Confidence is only allowed to control:

1. `answer`
   - if confidence is high enough
2. `abstain`
   - if confidence is below threshold
3. `escalate`
   - if confidence is below threshold and extra compute is allowed

It is not allowed to control routing, because this phase is single-model.

## Escalation definition

Escalation means:

- spend additional compute on the same item

Examples:

- second pass with a stricter prompt
- second pass with more tokens
- second pass with a verification-style prompt

Escalation is only useful if it improves hard cases enough to justify cost.

## Primary evaluation metrics

Answer quality:

- exact match
- normalized final-answer accuracy

Confidence quality:

- ECE
- Brier score
- AUROC of confidence vs correctness
- risk-coverage curve

Control quality:

- selective accuracy at fixed coverage
- abstain precision
- escalation lift on low-confidence subset

## Pass gate

This phase passes only if confidence improves a decision relative to
always-answer.

Minimum acceptable evidence:

- confidence separates correct from incorrect answers materially
- abstaining on low-confidence cases improves selective accuracy
  or
- escalating low-confidence cases improves performance on that subset

## Fail interpretation

If this fails, we do not move to multimodel Lumina work.

It means at least one of these is true:

- the current confidence formulation is wrong
- the current model family does not expose a useful correctness signal
- the task contract is still too noisy

## Out of scope for this phase

- multimodel routing
- specialist disagreement
- confidence blending
- branching trees
- general-domain confidence claims

Those only become valid research targets after this contract is satisfied.
