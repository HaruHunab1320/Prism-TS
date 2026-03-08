from __future__ import annotations

from dataclasses import dataclass
from typing import List

from lumina_basic.models.confidence_model import Candidate, LuminaBasicModel, normalize_answer


@dataclass
class BranchingConfig:
    low_conf_threshold: float = 0.35
    high_conf_threshold: float = 0.65
    answer_conf_threshold: float = 0.50
    max_branches: int = 5
    escalate_batch_size: int = 2
    max_new_tokens: int = 40
    temperature: float = 0.8
    top_p: float = 0.95
    seed: int = 7


@dataclass
class BranchTrace:
    decision: str
    reason: str
    branch_id: str | None = None


@dataclass
class BranchingResult:
    status: str
    final_answer: str
    final_confidence: float
    candidates: List[Candidate]
    trace: List[BranchTrace]


def _disagreement(cands: List[Candidate], conf_thr: float) -> bool:
    high = [c for c in cands if c.confidence >= conf_thr and c.answer.strip()]
    if len(high) < 2:
        return False
    normalized = {normalize_answer(c.answer) for c in high}
    return len(normalized) > 1


def run_branching_inference(
    model: LuminaBasicModel,
    prompt: str,
    config: BranchingConfig | None = None,
) -> BranchingResult:
    cfg = config or BranchingConfig()
    trace: List[BranchTrace] = []
    candidates: List[Candidate] = []
    next_branch_idx = 0

    def gen_one() -> Candidate:
        nonlocal next_branch_idx
        branch_id = f"b{next_branch_idx}"
        cand = model.generate_candidate(
            prompt=prompt,
            max_new_tokens=cfg.max_new_tokens,
            temperature=cfg.temperature,
            top_p=cfg.top_p,
            seed=cfg.seed + next_branch_idx,
            branch_id=branch_id,
        )
        next_branch_idx += 1
        return cand

    first = gen_one()
    candidates.append(first)
    trace.append(BranchTrace("generate", "initial", first.branch_id))

    while len(candidates) < cfg.max_branches:
        best = max(candidates, key=lambda c: c.confidence)
        if best.confidence < cfg.low_conf_threshold:
            extra = gen_one()
            candidates.append(extra)
            trace.append(BranchTrace("escalate", "low_confidence", extra.branch_id))
            continue

        if _disagreement(candidates, cfg.high_conf_threshold):
            to_add = min(cfg.escalate_batch_size, cfg.max_branches - len(candidates))
            for _ in range(to_add):
                extra = gen_one()
                candidates.append(extra)
                trace.append(BranchTrace("escalate", "high_confidence_disagreement", extra.branch_id))
            continue
        break

    best = max(candidates, key=lambda c: c.confidence)
    if best.confidence < cfg.answer_conf_threshold or not best.answer.strip():
        trace.append(BranchTrace("abstain", "final_confidence_below_threshold"))
        return BranchingResult(
            status="abstain",
            final_answer="",
            final_confidence=best.confidence,
            candidates=candidates,
            trace=trace,
        )

    trace.append(BranchTrace("answer", "best_confidence_selected", best.branch_id))
    return BranchingResult(
        status="answer",
        final_answer=best.answer,
        final_confidence=best.confidence,
        candidates=candidates,
        trace=trace,
    )
