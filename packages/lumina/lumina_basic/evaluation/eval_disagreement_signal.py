from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List

from lumina_basic.models.confidence_model import Candidate, LuminaBasicModel, normalize_answer


EVAL_SET = [
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
class SignalMetrics:
    prompts: int
    disagreement_prompts: int
    disagreement_rate: float
    disagreement_any_correct_rate: float
    non_disagreement_any_correct_rate: float
    disagreement_best_initial_em: float
    disagreement_best_all_em: float
    disagreement_em_gain: float
    policy_no_escalation_em: float
    policy_escalation_em: float
    policy_em_gain: float


def _prompt(question: str) -> str:
    return f"Answer briefly.\nQuestion: {question}\nAnswer:"


def _is_correct(answer: str, gold: str) -> bool:
    return normalize_answer(answer) == normalize_answer(gold)


def _is_high_conf_disagreement(cands: List[Candidate], threshold: float) -> bool:
    high = [c for c in cands if c.confidence >= threshold and c.answer.strip()]
    if len(high) < 2:
        return False
    return len({normalize_answer(c.answer) for c in high}) > 1


def _best(cands: List[Candidate]) -> Candidate:
    return max(cands, key=lambda c: c.confidence)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate high-confidence disagreement signal.")
    parser.add_argument("--model", default="distilgpt2")
    parser.add_argument("--num-conf-heads", type=int, default=3)
    parser.add_argument("--max-new-tokens", type=int, default=24)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--initial-branches", type=int, default=2)
    parser.add_argument("--max-branches", type=int, default=8)
    parser.add_argument("--high-conf-threshold", type=float, default=0.65)
    parser.add_argument("--answer-conf-threshold", type=float, default=0.50)
    parser.add_argument("--output-json", type=Path, default=None)
    args = parser.parse_args()

    if args.initial_branches < 1:
        raise ValueError("--initial-branches must be >= 1")
    if args.max_branches < args.initial_branches:
        raise ValueError("--max-branches must be >= --initial-branches")

    model = LuminaBasicModel(model_name=args.model, num_conf_heads=args.num_conf_heads)

    disagreement_count = 0
    disagreement_any_correct = 0
    non_disagreement_any_correct = 0
    non_disagreement_count = 0
    disagreement_initial_hits = 0
    disagreement_all_hits = 0
    policy_no_escalation_hits = 0
    policy_escalation_hits = 0

    global_idx = 0
    for row in EVAL_SET:
        prompt = _prompt(row["question"])
        all_cands: List[Candidate] = []
        for b in range(args.max_branches):
            all_cands.append(
                model.generate_candidate(
                    prompt=prompt,
                    max_new_tokens=args.max_new_tokens,
                    seed=args.seed + global_idx,
                    branch_id=f"b{b}",
                )
            )
            global_idx += 1

        initial = all_cands[: args.initial_branches]
        disagree = _is_high_conf_disagreement(initial, args.high_conf_threshold)
        any_correct = any(_is_correct(c.answer, row["answer"]) for c in all_cands)

        best_initial = _best(initial)
        best_all = _best(all_cands)

        if disagree:
            disagreement_count += 1
            disagreement_any_correct += int(any_correct)
            disagreement_initial_hits += int(_is_correct(best_initial.answer, row["answer"]))
            disagreement_all_hits += int(_is_correct(best_all.answer, row["answer"]))
        else:
            non_disagreement_count += 1
            non_disagreement_any_correct += int(any_correct)

        # Policy A: no escalation, always take best initial if above conf threshold.
        if best_initial.confidence >= args.answer_conf_threshold and _is_correct(best_initial.answer, row["answer"]):
            policy_no_escalation_hits += 1

        # Policy B: escalate only on disagreement and then choose best from all.
        chosen = best_all if disagree else best_initial
        if chosen.confidence >= args.answer_conf_threshold and _is_correct(chosen.answer, row["answer"]):
            policy_escalation_hits += 1

    total = len(EVAL_SET)
    disagreement_best_initial_em = (
        disagreement_initial_hits / disagreement_count if disagreement_count else 0.0
    )
    disagreement_best_all_em = disagreement_all_hits / disagreement_count if disagreement_count else 0.0
    metrics = SignalMetrics(
        prompts=total,
        disagreement_prompts=disagreement_count,
        disagreement_rate=disagreement_count / total if total else 0.0,
        disagreement_any_correct_rate=(
            disagreement_any_correct / disagreement_count if disagreement_count else 0.0
        ),
        non_disagreement_any_correct_rate=(
            non_disagreement_any_correct / non_disagreement_count if non_disagreement_count else 0.0
        ),
        disagreement_best_initial_em=disagreement_best_initial_em,
        disagreement_best_all_em=disagreement_best_all_em,
        disagreement_em_gain=disagreement_best_all_em - disagreement_best_initial_em,
        policy_no_escalation_em=policy_no_escalation_hits / total if total else 0.0,
        policy_escalation_em=policy_escalation_hits / total if total else 0.0,
        policy_em_gain=(policy_escalation_hits - policy_no_escalation_hits) / total if total else 0.0,
    )

    payload = {
        "model": args.model,
        "num_conf_heads": args.num_conf_heads,
        "initial_branches": args.initial_branches,
        "max_branches": args.max_branches,
        "high_conf_threshold": args.high_conf_threshold,
        "answer_conf_threshold": args.answer_conf_threshold,
        "metrics": asdict(metrics),
    }

    print(json.dumps(payload, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(payload, indent=2) + "\n")


if __name__ == "__main__":
    main()
