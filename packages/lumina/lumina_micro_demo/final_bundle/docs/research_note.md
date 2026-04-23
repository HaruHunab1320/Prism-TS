# Verifier-Backed Micro-Specialists for Local Code Transformation

## Abstract

This note documents the current validated result behind the Lumina micro-specialist demo. The central claim is narrow: for small, contract-specific code transformation tasks, a verifier-backed specialist can outperform a general base model, and a contract-specific confidence signal can support stable selective control. We test this claim on three JavaScript loop refactor contracts: loop-to-`map`, scalar-accumulator-to-`reduce`, and object-index-builder-to-`reduce`. Across all three, contract-matched specialists improved pass rates over the base model and supported stable thresholded acceptance policies. We then packaged the promoted specialists into a local runtime that decomposes a prompt, routes transformable spans, verifies each rewrite, applies threshold gating, and composes the final output. The result validates a narrow architecture pattern for local code transformation, not universal confidence or broad specialist routing.

## 1. Problem

Earlier Lumina work pursued broad specialists such as `math`, `code`, and `general`, plus routing and confidence machinery on top. That approach did not produce strong enough generator gains or reliable confidence behavior. The main issue was granularity: the specialists were still too broad, the contracts were underspecified, and correctness was often difficult to measure.

The micro-specialist program reframed the problem around very narrow tasks with hard contracts:

- the task must be easy to detect
- the output format must be strict
- correctness must be executable or verifier-backed
- confidence must mean probability of correctness for that exact contract

This note records the result of that shift.

## 2. Hypothesis

We test three linked hypotheses:

1. A narrow verifier-backed specialist can materially outperform a general base model on an exact code transformation contract.
2. A confidence signal is meaningful when defined as contract-specific correctness likelihood rather than as a generic model score.
3. A local runtime can compose multiple such specialists into a single prompt-to-response flow with verification and fallback.

## 3. Experimental Setting

### 3.1 Task family

The task family is intentionally narrow: JavaScript loop refactoring. The promoted contracts are:

- `js_array_loop_to_map`
- `js_reduce_accumulator_refactor`
- `js_reduce_object_index_builder`

Each contract requires one exact rewrite shape, one executable verifier, and one fixed threshold policy.

### 3.2 Method

For each contract we used the same pattern:

1. define the contract and verifier
2. measure the base model on that contract
3. train a contract-matched answer uplift only if there is headroom
4. train a contract-specific confidence head only if the evaluation split contains both positives and negatives
5. select and freeze a threshold after stability checks

Key design choices:

- synthetic contract-matched datasets rather than generic code instruction data
- executable verifiers rather than text-overlap scoring
- adversarial `hard_val_v2` splits where needed to create meaningful negatives
- confidence trained only on mixed positive/negative contract data

### 3.3 Base and runtime

The research specialists were trained on top of a `Qwen/Qwen2.5-Coder-1.5B-Instruct` family path. The packaged local runtime uses a single local Ollama backend (`llama3.1:latest`) shaped like a shared-base system, but not yet true adapter swapping.

## 4. Results

### 4.1 Contract-level answer uplift

Frozen answer-model results:

#### `js_array_loop_to_map`

- control pass rate: `0.797`
- treatment pass rate: `0.906`

#### `js_reduce_accumulator_refactor`

- control pass rate: `0.797`
- treatment pass rate: `1.000`

#### `js_reduce_object_index_builder`

- control pass rate: `0.641`
- treatment pass rate: `1.000`

Across all three contracts, a contract-matched uplift outperformed the base model.

### 4.2 Contract-specific confidence and selective control

Frozen control policies:

#### `js_array_loop_to_map`

- threshold: `0.30`
- coverage mean: `0.641`
- selective accuracy mean: `1.000`
- overall accuracy mean: `0.641`

#### `js_reduce_accumulator_refactor`

- threshold: `0.40`
- coverage mean: `0.898`
- selective accuracy mean: `1.000`
- overall accuracy mean: `0.898`

#### `js_reduce_object_index_builder`

- threshold: `0.50`
- coverage mean: `0.414`
- selective accuracy mean: `1.000`
- overall accuracy mean: `0.414`

These numbers should be read as high-precision selective transformation, not universal task solving. Coverage matters. The object-index contract is the clearest case: it reaches `1.000` selective accuracy only by being conservative at `0.414` coverage. The important point is that the confidence signal was strong enough to support stable selective acceptance on each exact contract once the training and evaluation data were aligned.

### 4.3 Local runtime result

The packaged runtime takes a normal JavaScript refactor prompt, extracts transformable spans, routes them to the three promoted specialists, verifies each output, applies threshold gating, and composes the final code.

Validated local benchmark on Mac via Ollama (`llama3.1:latest`):

- iterations: `3`
- cold-stop-first: `true`
- final statuses: `completed`, `completed`, `completed`
- accepted counts: `3`, `3`, `3`
- mean total latency: `2678.38 ms`
- min total latency: `2160.63 ms`
- max total latency: `3290.43 ms`
- loaded model: `5.9 GB`, `100% GPU`, context `4096`

This validates the local runtime shape:

prompt -> span extraction -> routing -> specialist generation -> verification -> threshold gate -> composition

It does not validate the final deployment architecture. The local demo currently runs through a single Ollama backend and uses runtime heuristics shaped by the frozen contracts rather than loading the persisted research heads directly.

## 5. Main Findings

### 5.1 What is validated

- Narrow verifier-backed specialists can materially outperform a base model on precise code transformation contracts.
- Contract-matched target shape matters as much as model family.
- Contract-specific confidence can support stable selective control when it is trained on meaningful positives and negatives.
- A local runtime can compose several such specialists into one prompt-to-response flow.

### 5.2 What is not validated

- universal confidence across tasks
- broad code competence
- the original broad multimodel arbitration thesis
- true shared-base adapter loading in the local runtime

These results are intentionally contract-specific.

## 6. Failure Modes and Lessons

Several failures were important in reaching the current result:

- broad specialists stayed weak because the contracts were too blurry
- generic code fine-tuning hurt execution performance when the training contract mismatched the runtime
- some contracts required adversarial evaluation splits before confidence was even meaningful
- output extraction and runtime contract details were often as important as training itself

The core lesson is that the unit of progress is not “a specialist model.” It is a full contract: routing rule, prompt shape, output extraction, verifier, confidence signal, and threshold policy.

## 7. Limitations

- The current specialist library is small: only three promoted contracts.
- The data is heavily synthetic and contract-shaped.
- The local runtime still uses heuristic confidence in the demo backend rather than loading the persisted research heads directly.
- The local runtime is adapter-shaped in interface only; it is not yet a true adapter-swapping implementation.
- The evidence is currently limited to narrow JavaScript refactoring tasks.

## 8. Next Steps

The most valuable next step is not more blind specialist proliferation. It is tightening the architecture gap between the validated research pattern and the local runtime:

1. replace the single-model local backend with true shared-base adapter loading
2. load persisted contract-specific confidence heads directly in the runtime
3. add one or two additional specialists only if they compose cleanly with the existing three
4. harden the local demo into a public-facing artifact without broadening the claims

## 9. Conclusion

The strongest conclusion is narrow but real:

For small verifier-backed code transformation contracts, micro-specialists with contract-specific confidence are a workable local architecture pattern.

This is not a result about universal confidence or general modular intelligence. It is a concrete result about how to build a local code system that can decide when a narrow transformation is good enough to keep.
