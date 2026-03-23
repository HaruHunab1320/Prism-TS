# Specialist Next Phase

Last updated: 2026-03-18

## Why the next phase changes

The multimodel stack is now stable enough to measure.

What is established:
- routing is strong and reproducible (`~0.992-0.994`)
- the current combined plain baseline is stable (`F1 ~0.081`, `task ~0.140`)
- confidence blending does not improve over router-only
- disagreement utility is not present in the current regime (`subset_size=0`)

What this means:
- the active problem is no longer routing or calibration
- the active problem is specialist construction

The current specialists are still too weak and too homogeneous to create the signal Lumina needs.

## Objective

Create specialists that are:
- stronger within-domain
- more diverse in failure modes
- sufficiently different that `oracle@2` and disagreement subsets become non-trivial

Only then does Lumina-specific arbitration become meaningfully testable.

## Working diagnosis

Most likely current failure mode:
- same-family or near-same-family specialists
- overlapping data mixtures
- similar output schemas
- similar decoding behavior
- therefore correlated errors

Symptoms already observed:
- top-2 current ~= top-1 direct answer
- oracle@2 hidden upside now measured at roughly `+0.021 task` / `+0.015 success@0.7`
- no high-confidence disagreement subset

## Immediate research questions

1. Are specialists mostly weak, mostly homogeneous, or both?
2. Does `oracle@2` reveal hidden complementarity that current selection fails to exploit?
3. If not, can heterogeneous bases or more structured data create that complementarity?

## Next experiments

### 1. Specialist diversity diagnostic

Purpose:
- measure whether top-2 expert sets contain real hidden upside

Metrics:
- `oracle@2`
- average alternate-candidate lift over selected answer
- answer overlap between candidate 0 and candidate 1
- domain score distribution by candidate rank

Pass signal:
- `oracle@2` exceeds selected top-2 score by meaningful margin (`>= +0.02 task`)

Fail signal:
- `oracle@2` is nearly tied with selected top-2
- this means the current experts are not just poorly selected; they are not diverse enough

Status:
- pass
- current stack has modest but real hidden top-2 upside
- next bounded step is a selector/correctness model that tries to recover that upside

### 2. Same-backbone adapter trio

Purpose:
- establish the strongest controlled baseline with one shared base and three domain adapters

Recommended pattern:
- one strong 7B–8B open base
- separate adapters for general / math / code
- same tokenizer, same backbone, different domain SFT data

Expected value:
- should improve plain baseline quality
- likely modest gains in diversity

### 3. Heterogeneous-base trio

Purpose:
- deliberately create complementary experts

Recommended pattern:
- general: strong open instruct generalist
- math: math-specialized family
- code: code-specialized family

Expected value:
- highest chance of non-trivial `oracle@2`
- highest chance of meaningful disagreement emerging later

## Data recommendations

### General
- high-quality open instruction mixtures
- grounded / verified QA where possible
- avoid dumping one synthetic teacher style everywhere

### Math
- verifiable exact-answer data
- structured solution/check formats
- mix arithmetic, algebra, symbolic, and word-problem slices

### Code
- executable/testable tasks
- synthesis + bug-fix + edit + explanation buckets
- prioritize datasets aligned with execution or unit-test signals

## What not to do next

- more router tuning
- more confidence blending sweeps
- more post-hoc calibration work
- more disagreement heuristics on the current specialist pool

Those are downstream mechanisms. The current blocker is upstream expert quality/diversity.

## Immediate runnable order

1. Train/evaluate a top-2 selector on frozen candidate dumps
2. If selector cannot recover a meaningful share of oracle lift, prioritize heterogeneous-base specialists
3. First heterogeneous target should be the code specialist, because it still uses the least domain-native base in the current promoted stack

Current status:
- selector gate failed
- next concrete experiment is a code-native family uplift under the frozen robust-router baseline
- dataset audit indicates code is the weakest supervision path:
  - `~94%` of code train is `CodeAlpaca`
  - current recipe caps answer loss at `24` tokens, which is likely too short for code targets
  - next concrete rebuild is a filtered `datasets_code_exec_v1` slice plus longer code targets
- next best lift experiment after code remains math:
  - use the full exact-answer math set
  - stop over-canonicalizing symbolic targets during training
  - widen math target budget modestly (`answer-max-tokens 16`, `max-len 256`)
