# Training Audit — 2026-03-23

## Scope

Audit of the current specialist training path for `general`, `math`, and `code` in `lumina_multimodel`, focused on why recent experiments only produced weak positive movement after routing stabilized.

Files inspected:
- `lumina_multimodel/training/train_gpt2_generator.py`
- `lumina_multimodel/evaluation/eval_generator_qa.py`
- `lumina_multimodel/evaluation/eval_aggregator_minimal.py`
- `lumina_multimodel/data/ingest_hq_v2_datasets.py`
- `lumina_multimodel/tools/cloud/experiments_general_generator_uplift.yaml`
- `lumina_multimodel/tools/cloud/experiments_math_uplift_robust_router_5000.yaml`
- `lumina_multimodel/tools/cloud/experiments_math_exact_uplift_5000.yaml`
- `lumina_multimodel/tools/cloud/experiments_code_generator_uplift.yaml`
- `lumina_multimodel/tools/cloud/experiments_code_exec_uplift_5000.yaml`

## Bottom line

The current stack is not "training specialists" in a strong sense. It is doing light last-layer adaptation of base instruct models on narrow short-answer JSONL datasets, then evaluating them with a generation path that only partially matches training.

This is enough to test routing and some selection behavior. It is not enough to draw strong conclusions about specialist construction.

## Ranked issues

### 1. Prompt mismatch between training, QA eval, and aggregator

Severity: high

The training path often uses `--strict-answer`, which changes prompts to:
- math: `Answer (single number only):`
- other domains: `Answer (short):`

This happens in:
- `lumina_multimodel/training/train_gpt2_generator.py`
- `lumina_multimodel/scripts/train_general_v2.sh`
- `lumina_multimodel/tools/cloud/experiments_math_uplift_robust_router_5000.yaml`
- `lumina_multimodel/tools/cloud/experiments_math_exact_uplift_5000.yaml`

But the aggregator always generates with:
- `Question: ...`
- `Answer:`

That happens in:
- `lumina_multimodel/evaluation/eval_aggregator_minimal.py`

Implication:
- The promoted end-to-end system is not using the same prompt format the treatment models were trained and QA-probed on.
- Any uplift measured in `eval_generator_qa.py` can partially disappear in `eval_aggregator_minimal.py` simply because the runtime prompt changed.

This is a clean, deterministic mismatch. It should be removed before further specialist conclusions.

### 2. Uniform generation budget across domains is structurally wrong

Severity: high

The aggregator uses a shared:
- `--max-new-tokens 24`

for general, math, and code in all major confirm runs.

That is acceptable for:
- very short general answers
- very short math answers

It is not a good fit for code, where the curated dataset has:
- train average answer length ~`24.6` words
- train average answer length ~`160` chars

Even after the code rebuilds, the runtime decode budget stayed at `24` new tokens in:
- `lumina_multimodel/tools/cloud/experiments_code_generator_uplift.yaml`
- `lumina_multimodel/tools/cloud/experiments_code_exec_uplift_5000.yaml`
- `lumina_multimodel/tools/cloud/experiments_code_v3_uplift_5000.yaml`

Implication:
- Code specialists are being judged in the combined system under an artificially tight answer budget.
- This suppresses any benefit from richer code targets.

If the product wants short answer snippets only, then the code dataset must be designed for that explicitly. If the product wants actual code answers, the decode budget must change.

### 3. The code eval metric is misaligned with code correctness

Severity: high

Code QA is currently evaluated with text EM/F1 in:
- `lumina_multimodel/evaluation/eval_generator_qa.py`

And the aggregator's domain score for code uses:
- token F1
- `SequenceMatcher`

in:
- `lumina_multimodel/evaluation/eval_aggregator_minimal.py`

Implication:
- The pipeline is rewarding lexical resemblance, not execution correctness.
- For code, this is too weak to support serious training decisions.

This is likely one reason code-family swaps and code dataset tweaks have produced noisy or tiny end-to-end effects.

### 4. The adaptation recipe is extremely shallow

Severity: high

`train_gpt2_generator.py`:
- freezes the whole base model
- unfreezes only the last `n` decoder blocks
- unfreezes `lm_head`

Current experiments usually run with:
- `--unfreeze-n 2`
- `--epochs 1` or `2`
- `--batch-size 2`
- `--lr 8e-6`

Implication:
- This is closer to a minimal adaptation probe than a robust specialist training recipe.
- On 1.5B models, this setup is unlikely to induce deep domain specialization.

This does not mean the method is wrong. It means the current results should be interpreted as light adaptation results, not strong specialist training results.

### 5. Domain datasets are shaped around short-answer convenience, not domain-native supervision

Severity: medium-high

Current dataset stats from `datasets_hq_v2_curated`:

- `general_specialist/train.jsonl`
  - `120000` rows
  - `trivia_qa 70168`, `squad_v2 49832`
  - avg answer length ~`2.8` words

- `math_specialist/train.jsonl`
  - `10433` rows
  - `gsm8k 7005`, `metamathqa 3428`
  - avg answer length ~`1.0` word

- `code_specialist/train.jsonl`
  - `18918` rows
  - `codealpaca 17857`, `mbpp 915`, `humaneval 146`
  - avg answer length ~`24.6` words

Implication:
- `general` is effectively a short factual QA model.
- `math` is effectively an exact-answer extractor.
- `code` mixes long program outputs with a single causal LM target and no execution signal.

These are not comparable forms of specialization. They are three different target regimes with one shared training abstraction.

### 6. Math target canonicalization changes the task itself

Severity: medium

`train_gpt2_generator.py` supports `--math-canonical-targets`, which strips math answers to very short forms, often preferring the terminal numeric token.

This was used in:
- `lumina_multimodel/tools/cloud/experiments_math_uplift_robust_router_5000.yaml`

Implication:
- The model is no longer learning the original answer form from the source dataset.
- It is learning the postprocessed metric target.

That can be a valid choice, but it means:
- improvements may only reflect canonicalized exact-answer behavior
- not broader math competence

The follow-up `math exact` run relaxed this, but the underlying design decision remains unresolved.

### 7. Training/eval postprocessing is inconsistent across paths

Severity: medium

`eval_generator_qa.py` can apply:
- `--constrained-postprocess`
- `--math-canonical-metric`

The aggregator does not use the same constrained postprocessing path. It only:
- extracts after `Answer:`
- keeps first two lines

Implication:
- stand-alone QA scores and end-to-end aggregator scores are not measured on the same postprocessing contract
- this makes isolated QA wins harder to interpret

### 8. Experiment hygiene has been too loose

Severity: medium

Recent runs exposed several non-model issues:
- stale checkpoint path in combined confirm
- `pipefail` missing in some dataset build chains
- launcher still creating spot instances despite `preemptible: false`
- dataset build fallback changed the hypothesis midstream

Implication:
- some recent negative results were not purely model failures
- the experiment layer still needs tightening before expensive new training sweeps

## What the current setup is actually good for

The current setup is useful for:
- routing studies
- calibration/control-flow studies
- quick adaptation probes
- finding obvious data/objective mismatches

It is not yet a rigorous specialist training framework.

## Recommended fixes by priority

### Priority 0: remove deterministic mismatch before any more training

1. Unify prompts across:
- training
- stand-alone QA eval
- aggregator eval

Pick one contract per domain and keep it fixed.

2. Unify postprocessing/metric contract across:
- QA probes
- aggregator scoring

If math is canonicalized, canonicalize everywhere. If code is exact snippet generation, enforce that everywhere.

3. Use domain-specific generation budgets in the aggregator:
- general: short
- math: short
- code: longer, unless code is deliberately reformulated as short-answer completion

### Priority 1: make the next experiments scientifically clean

4. One causal change per run.

5. No fallbacks that silently change the hypothesis.

6. No spot/preemptible runs for long diagnostics unless the run is resumable.

### Priority 2: decide what each specialist is actually supposed to do

7. Define per-domain output contracts:
- general: short factual answer?
- math: exact final answer only?
- code: full solution, patch, or short snippet?

Right now code is the most underspecified.

### Priority 3: strengthen training only after the contract is fixed

8. Replace shallow last-2-layer tuning with a more serious adaptation recipe for at least one domain:
- LoRA/QLoRA or a larger unfreeze window
- more than one epoch where warranted
- domain-specific loss/format constraints

9. For code, move to an execution-aware eval before drawing more code conclusions.

## The next clean experiment set

### Experiment A — Prompt-contract ablation

Objective:
- measure how much uplift is being lost purely to prompt mismatch

Design:
- freeze current promoted checkpoints
- run aggregator with domain-specific prompts matching training
- compare against current `Answer:` baseline

Single variable:
- inference prompt only

### Experiment B — Decode-budget ablation for code

Objective:
- determine whether code is being clipped at inference

Design:
- freeze current promoted checkpoints
- rerun combined eval with code `max_new_tokens` materially larger
- keep general/math unchanged

Single variable:
- code decode budget only

### Experiment C — Training recipe ablation on one domain

Objective:
- test whether the shallow adaptation recipe is the limiting factor

Design:
- pick one domain, preferably code
- keep data fixed
- compare current `unfreeze-n=2` recipe against a stronger adaptation recipe

Single variable:
- adaptation method only

## Recommendation

Do not start another dataset search immediately.

First fix the training/eval contract mismatches that are already in the repo:
- prompt mismatch
- decode-budget mismatch
- metric/postprocess mismatch

If those do not move results, then move to a stricter specialist rebuild with a stronger adaptation method and domain-native eval.
