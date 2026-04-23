# Code Confidence Next Steps

This is the next application of the same Lumina principle used for math:

- improve base answer quality
- learn `answer_confidence` against a verifiable contract
- use confidence to control answer / escalate / abstain behavior

For code, the contract must be execution-aware from the start.

## Core definition

For code:

- `answer_confidence = P(submitted code passes the task contract tests | prompt, model state, produced code)`

This should be tied to executable correctness, not lexical overlap.

## Why code is the right next domain

- it is verifiable
- it has stronger product relevance than math alone
- execution gives a cleaner target than open-ended text QA

We already learned this on the multimodel path:

- lexical code F1 was misleading
- execution-aware eval was necessary

## Contract requirements

Before training anything new, define the code contract clearly.

Recommended first contract:

- input: short Python synthesis task
- output: Python function or snippet only
- correctness: benchmark tests pass
- confidence target:
  - `1` if tests pass
  - `0` otherwise

Keep the first version narrow:

- Python only
- synthesis only
- no edits / patches yet

## Existing building blocks

Already available in the repo:

- execution-aware benchmark fixtures
- code execution benchmark path in the multimodel area

What still needs to be built for `lumina_basic`:

- a code-only contract evaluator inside `lumina_basic`
- a code confidence probe path analogous to the math path
- a small runtime that emits Prism-style metadata for code

## Recommended staged plan

### Stage 1 — Code contract

Build:

- `code_confidence_contract.md`
- `eval_code_confidence.py`

Metrics:

- pass rate
- syntax-valid rate
- confidence AUROC vs pass/fail
- risk-coverage

Pass condition:

- confidence shows non-trivial ranking quality on pass/fail

### Stage 2 — Code baseline

Pick one code-native base path and freeze it.

Recommendation:

- use the strongest already-supported code path in this repo
- do not start with a new family swap

First objective:

- get a stable code execution baseline under the contract

### Stage 3 — Code confidence probe

Train a probe using:

- generation stats
- contract-aware code features
  - syntax-valid flag
  - code-block presence
  - function-signature presence
  - compile / parse success
  - maybe simple execution metadata

### Stage 4 — Control validation

Compare:

- always answer
- abstain below threshold
- escalate below threshold

But do not design fancy code escalation first.
First prove that code confidence predicts execution success.

## What not to do

- do not reuse lexical F1 as the main code gate
- do not start with multimodel code routing again
- do not mix code synthesis, patching, and explanation into one first contract
- do not add more architecture before the code contract is proven

## Immediate next concrete tasks

1. write `lumina_basic/notes/code_confidence_contract.md`
2. port or adapt execution-aware evaluation into `lumina_basic`
3. run one single-model code confidence baseline under that contract
