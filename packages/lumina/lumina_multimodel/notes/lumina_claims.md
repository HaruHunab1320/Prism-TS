# Lumina Claims, What We Are Proving, and Current Status

## What Lumina Is (and is not)
Lumina is the orchestration layer: routing, confidence, and aggregation.
It is not a new generator. Generators are just the answer-producing models
so we can evaluate the end-to-end system.

## Core Claims (Falsifiable)
1) Confidence-based routing improves domain selection.
   - Test: hybrid routing accuracy > router-only and > confidence-only.
2) Aggregation improves answer quality versus single expert.
   - Test: aggregator metrics (F1 / task score) improve with hybrid routing.
3) Selective prediction works (abstain when uncertain).
   - Test: abstain rate increases when conflict/low confidence rises, without
     collapsing task score.
4) Calibration is meaningful enough to support routing + aggregation.
   - Test: calibration metrics improve and correlate with actual answer quality.

## What Generators Are For
Generators provide answers for aggregation. If generators are too weak,
they cap the measurable gains of routing and aggregation.

## Current Evidence (as of Feb 7, 2026)
Routing:
- Hybrid routing > router-only > confidence-only on 1k samples.
- This supports Claim (1).

Aggregation:
- With baseline generators, hybrid aggregation reaches the current best
  metrics (F1 ~0.262, task score ~0.391).
- This shows the end-to-end loop works, but is limited by generator quality.

Generator experiments:
- Longer training on merged data (003a/003b) regressed versus baseline.
- Pretrained GPT-2 / DistilGPT-2 generators performed far worse.
- Real-only generators performed far worse.
- Conclusion: generator quality is the current bottleneck.

## Next Experiments That Directly Test the Claims
1) Improve generator quality without increasing size.
   - Example: filtered merged datasets with shorter, higher-quality answers.
2) Strengthen confidence calibration and re-run routing + aggregation.
   - Goal: show calibration directly improves aggregation metrics.
3) Keep generators fixed and iterate routing/aggregation thresholds.
   - Goal: show measurable gains from orchestration alone.

## Practical Rule
If an experiment changes generators, it tests the generator.
If it changes routing/aggregation only, it tests Lumina.
