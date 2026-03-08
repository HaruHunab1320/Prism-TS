from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List

from lumina_basic.inference.branching import BranchingConfig, run_branching_inference
from lumina_basic.models.confidence_model import LuminaBasicModel, normalize_answer


SMOKE_SET = [
    {"question": "What is 2 + 2?", "answer": "4"},
    {"question": "What color is the clear daytime sky?", "answer": "blue"},
    {"question": "What is the capital of France?", "answer": "paris"},
    {"question": "How many days are in a week?", "answer": "7"},
    {"question": "What gas do plants absorb from the atmosphere?", "answer": "carbon dioxide"},
    {"question": "What is H2O commonly called?", "answer": "water"},
    {"question": "Who wrote Romeo and Juliet?", "answer": "william shakespeare"},
    {"question": "What is the opposite of hot?", "answer": "cold"},
    {"question": "How many months are in a year?", "answer": "12"},
    {"question": "What planet do humans live on?", "answer": "earth"},
]


@dataclass
class EvalMetrics:
    samples: int
    answered: int
    abstained: int
    answered_rate: float
    em_answered: float
    em_overall: float
    token_f1_answered: float


def _tokenize(text: str) -> List[str]:
    return [t for t in re.split(r"\s+", normalize_answer(text)) if t]


def _f1(pred: str, gold: str) -> float:
    p = _tokenize(pred)
    g = _tokenize(gold)
    if not p or not g:
        return 0.0
    p_counts = {}
    for t in p:
        p_counts[t] = p_counts.get(t, 0) + 1
    overlap = 0
    for t in g:
        n = p_counts.get(t, 0)
        if n > 0:
            overlap += 1
            p_counts[t] = n - 1
    if overlap == 0:
        return 0.0
    precision = overlap / len(p)
    recall = overlap / len(g)
    return 2 * precision * recall / (precision + recall)


def _prompt(q: str) -> str:
    return f"Answer briefly.\nQuestion: {q}\nAnswer:"


def _evaluate_baseline(
    model: LuminaBasicModel,
    data: List[dict],
    answer_conf_threshold: float,
    max_new_tokens: int,
    seed: int,
) -> EvalMetrics:
    answered = 0
    em_answered_hits = 0
    em_overall_hits = 0
    f1_sum_answered = 0.0

    for i, row in enumerate(data):
        cand = model.generate_candidate(
            prompt=_prompt(row["question"]),
            max_new_tokens=max_new_tokens,
            seed=seed + i,
            branch_id="b0",
        )
        if cand.confidence < answer_conf_threshold or not cand.answer.strip():
            continue
        answered += 1
        em = int(normalize_answer(cand.answer) == normalize_answer(row["answer"]))
        em_answered_hits += em
        em_overall_hits += em
        f1_sum_answered += _f1(cand.answer, row["answer"])

    total = len(data)
    return EvalMetrics(
        samples=total,
        answered=answered,
        abstained=total - answered,
        answered_rate=answered / total if total else 0.0,
        em_answered=em_answered_hits / answered if answered else 0.0,
        em_overall=em_overall_hits / total if total else 0.0,
        token_f1_answered=f1_sum_answered / answered if answered else 0.0,
    )


def _evaluate_branching(
    model: LuminaBasicModel,
    data: List[dict],
    cfg: BranchingConfig,
) -> EvalMetrics:
    answered = 0
    em_answered_hits = 0
    em_overall_hits = 0
    f1_sum_answered = 0.0

    for row in data:
        out = run_branching_inference(model, _prompt(row["question"]), config=cfg)
        if out.status != "answer":
            continue
        answered += 1
        em = int(normalize_answer(out.final_answer) == normalize_answer(row["answer"]))
        em_answered_hits += em
        em_overall_hits += em
        f1_sum_answered += _f1(out.final_answer, row["answer"])

    total = len(data)
    return EvalMetrics(
        samples=total,
        answered=answered,
        abstained=total - answered,
        answered_rate=answered / total if total else 0.0,
        em_answered=em_answered_hits / answered if answered else 0.0,
        em_overall=em_overall_hits / total if total else 0.0,
        token_f1_answered=f1_sum_answered / answered if answered else 0.0,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Lumina Basic smoke eval")
    parser.add_argument("--model", default="distilgpt2")
    parser.add_argument("--num-conf-heads", type=int, default=3)
    parser.add_argument("--max-new-tokens", type=int, default=24)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--answer-conf-threshold", type=float, default=0.50)
    parser.add_argument("--output-json", type=Path, default=None)
    args = parser.parse_args()

    model = LuminaBasicModel(model_name=args.model, num_conf_heads=args.num_conf_heads)
    data = SMOKE_SET

    baseline = _evaluate_baseline(
        model=model,
        data=data,
        answer_conf_threshold=args.answer_conf_threshold,
        max_new_tokens=args.max_new_tokens,
        seed=args.seed,
    )
    branching = _evaluate_branching(
        model=model,
        data=data,
        cfg=BranchingConfig(
            answer_conf_threshold=args.answer_conf_threshold,
            max_new_tokens=args.max_new_tokens,
            seed=args.seed,
        ),
    )

    payload = {
        "model": args.model,
        "num_conf_heads": args.num_conf_heads,
        "baseline": asdict(baseline),
        "branching": asdict(branching),
    }
    print(json.dumps(payload, indent=2))

    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(payload, indent=2) + "\n")


if __name__ == "__main__":
    main()
