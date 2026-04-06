# Prism Confidence Metadata Contract

This note defines the first Prism-facing metadata contract backed by actual
`lumina_basic` evidence.

Scope:

- domain: `math`
- task contract: exact final-answer math
- active path:
  - fine-tuned `Qwen/Qwen2.5-Math-1.5B-Instruct`
  - `probe v2`
  - `mode=escalation`
  - `threshold=0.20`

This is not a universal confidence schema for all tasks. It is the first
validated contract for one narrow, verifiable path.

## Meaning of confidence

For this contract:

- `answer_confidence = P(final answer is correct | prompt, model state, produced answer)`

This is a learned correctness estimate.

It is not:

- token logprob
- fluency score
- routing confidence
- generic model certainty

## Metadata fields

Recommended Prism-facing payload:

```json
{
  "schema_version": "lumina.answer_confidence.v1",
  "task_contract": "math_final_answer_v1",
  "domain": "math",
  "confidence_mode": "correctness_estimate",
  "confidence_definition": "P(final answer is correct | prompt, model state, produced answer)",
  "answer_confidence": 0.31,
  "control_mode": "escalation_selective",
  "control_action": "escalate",
  "control_threshold": 0.20,
  "escalate_threshold": 0.35,
  "escalation_attempted": true,
  "selected_path": "escalate",
  "answer_model": "lumina_multimodel/outputs_gen/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen",
  "confidence_model": "lumina_multimodel/outputs_gen/lumina_basic_qwen_math_probe_v2_stability.pt",
  "math_contract_features": true
}
```

## Field semantics

- `schema_version`
  - versioned contract identifier for downstream consumers

- `task_contract`
  - the exact evaluation / correctness regime this confidence is calibrated to

- `confidence_mode`
  - current value: `correctness_estimate`
  - indicates that confidence is a learned estimate of final-answer correctness

- `answer_confidence`
  - scalar used for control decisions and UI metadata

- `control_mode`
  - the policy family used by the runtime
  - current promoted value: `escalation_selective`

- `control_action`
  - what the runtime actually did for this response
  - allowed values in this contract:
    - `answer`
    - `escalate`
    - `abstain`

- `control_threshold`
  - threshold used to decide whether the selected answer is acceptable

- `escalate_threshold`
  - threshold below which the runtime is allowed to spend extra compute

- `selected_path`
  - which answer path produced the final answer
  - current values:
    - `base`
    - `escalate`

- `math_contract_features`
  - whether the active confidence head used the contract-aware feature set

## What Prism should assume

Prism may assume:

- larger `answer_confidence` means more likely correct under this exact math
  contract
- `control_action` reflects actual runtime behavior
- the field is meaningful enough to expose as metadata for this path

Prism should not assume:

- the same scale transfers to other domains
- the same threshold transfers to other models
- `answer_confidence` is calibrated for open-ended tasks

## Current promoted operating point

Stable across seeds:

- `mode = escalation`
- `threshold = 0.20`
- coverage mean: `0.853`
- selective accuracy mean: `0.256`
- overall accuracy mean: `0.218`
- gain vs always-answer mean: `+0.056`

## Implementation

Reference code:

- `lumina_basic/models/answer_metadata.py`

Current constructor:

- `build_math_answer_metadata(...)`

This should be the only contract Prism treats as validated until another domain
is proven separately.
