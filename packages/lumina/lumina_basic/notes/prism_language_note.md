# Prism Language Note

This note separates what belongs in `Prism` from what belongs in `Lumina`.

## What Prism should express

Prism is a language/runtime abstraction layer.

It should be able to express that a model response may carry:

- primary output
- metadata about that output
- control decisions taken by the runtime

For confidence-aware runtimes, the language should support concepts like:

- `answer_confidence`
- `confidence_mode`
- `control_mode`
- `control_action`
- `control_threshold`
- `selected_path`

Prism should treat these as abstract fields, not as model-specific mechanics.

## What Prism should not encode

Prism should not assume:

- confidence comes from logits
- confidence is universal across tasks
- thresholds are portable across models
- a runtime uses branching, escalation, or abstention in one fixed way

Those are runtime concerns.

## What Lumina proves

`Lumina` is the proof-of-concept implementation.

Right now it proves one narrow claim:

- for a verifiable math task, a runtime can emit a learned
  `answer_confidence` signal that is useful for control decisions

That proof currently comes from:

- fine-tuned Qwen math answer model
- `probe v2`
- `mode=escalation`
- `threshold=0.20`

## Recommended language-level shape

At the Prism level, the shape should stay minimal:

```json
{
  "output": "...",
  "metadata": {
    "answer_confidence": 0.31,
    "confidence_mode": "correctness_estimate",
    "control_action": "escalate",
    "control_mode": "escalation_selective",
    "task_contract": "math_final_answer_v1"
  }
}
```

The language only needs to know that these fields may exist and what they
mean semantically.

It does not need to know:

- which probe produced them
- which model family produced them
- how the runtime compared candidate paths

## Current recommendation

- Keep Prism abstract.
- Keep Lumina concrete.
- Use Lumina to justify which metadata concepts Prism should support.
- Only promote metadata concepts into Prism after they are backed by a
  validated Lumina contract.

## Current validated concept set

Validated enough to represent in Prism:

- `answer_confidence`
- `confidence_mode=correctness_estimate`
- `control_action`
- `control_mode`
- `task_contract`

Not validated enough to make language commitments yet:

- disagreement significance
- routing confidence
- generic branching semantics
- universal uncertainty fields
