# Lumina Validated Evidence — 2026-04-10

This note states what the current `lumina_basic` work has actually validated.

## What is validated

### 1. Answer confidence can be defined operationally

For the active contracts, confidence now means:

- estimated probability that the produced final answer is correct under the
  active task contract

This is no longer a vague scalar or a proxy for fluency.

### 2. Math: confidence is useful for control

Promoted math path:

- answer model: fine-tuned `Qwen/Qwen2.5-Math-1.5B-Instruct`
- confidence head: `probe v2`
- mode: `escalation`
- threshold: `0.20`

Observed stable behavior:

- coverage mean: `0.853`
- selective accuracy mean: `0.256`
- overall accuracy mean: `0.218`
- gain vs always-answer mean: `+0.056`

Interpretation:

- the math path validates a real confidence/control loop
- the result is modest in absolute quality, but the control behavior is real

### 3. Code: contract-matched training matters

The decisive code lift came from matching the training setup to the runtime
contract:

- Python-only tasks
- benchmark-shaped prompts
- strict code-only output expectations
- callable-name alignment

That moved execution pass rate from `0.26` to `0.37`.

### 4. Code: learned confidence is useful for selective answering

Promoted code path:

- answer model: Python-contract code model
- confidence head: `code_probe_v1`
- mode: `baseline selective`
- threshold: `0.40`

Observed stable behavior:

- coverage mean: `0.72`
- selective accuracy mean: `0.50`
- overall accuracy mean: `0.36`
- gain vs always-answer mean: `+0.13`

Interpretation:

- code now validates the same general principle as math:
  - answer quality first
  - learned correctness estimate second
  - thresholded control third

### 5. Prism-facing metadata has a justified reference shape

The current Lumina evidence supports metadata fields like:

- `answer_confidence`
- `confidence_mode`
- `task_contract`
- `control_mode`
- `control_action`
- `control_threshold`

This belongs in Prism as language-level expressivity, not as a model-specific
implementation.

## What is not validated

- universal confidence across arbitrary tasks
- multimodel arbitration as the main value path
- disagreement as a generally useful signal
- prompt-only escalation as a reliable mechanism
- raw model logits as sufficient confidence metadata

## Current strongest statement

The current strongest defensible statement is:

- models should expose task-calibrated `answer_confidence` metadata when that
  confidence has been validated against correctness under a known contract

That statement is supported by both the promoted math path and the promoted
code path.

## Practical implication

Lumina is now a proof of concept for contract-specific confidence metadata and
control behavior.

Prism should stay abstract:

- it should describe the metadata concepts
- it should not assume one concrete model, probe, or runtime
