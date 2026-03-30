from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List

from lumina_basic.models.confidence_model import LuminaBasicModel
from lumina_basic.models.confidence_probe import load_probe


DEFAULT_DATA = Path("lumina_multimodel/datasets_hq_v2_curated/math_specialist/val.jsonl")


def load_jsonl(path: Path) -> List[Dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def math_prompt(question: str) -> str:
    return f"Question: {question}\nAnswer:"


def math_escalation_prompt(question: str) -> str:
    return (
        "Solve carefully. Return only the final numeric answer.\n"
        f"Question: {question}\nAnswer:"
    )


def extract_math_final_answer(text: str) -> str:
    s = (text or "").strip()
    if not s:
        return ""
    s = re.sub(r"```[A-Za-z0-9_+-]*", "", s).replace("```", "")
    m = re.search(r"(?:final answer|answer)\s*[:=]\s*([^\n]+)", s, flags=re.IGNORECASE)
    if m:
        s = m.group(1).strip()
    first_line = s.splitlines()[0].strip()
    number_like = re.findall(r"[-+]?\d+(?:,\d{3})*(?:\.\d+)?(?:/\d+(?:\.\d+)?)?", first_line)
    if number_like:
        return canonicalize_number(number_like[-1])
    compact = re.sub(r"\s+", " ", first_line).strip().lower()
    return compact


def canonicalize_number(token: str) -> str:
    t = (token or "").strip().lower().replace(",", "")
    if not t:
        return ""
    if "/" in t and re.fullmatch(r"[-+]?\d+(?:\.\d+)?/[-+]?\d+(?:\.\d+)?", t):
        num_s, den_s = t.split("/", 1)
        try:
            num = float(num_s)
            den = float(den_s)
            if den == 0:
                return t
            value = num / den
            if value.is_integer():
                return str(int(value))
            return f"{value:.12g}"
        except Exception:
            return t
    try:
        value = float(t)
        if value.is_integer():
            return str(int(value))
        return f"{value:.12g}"
    except Exception:
        return t


def is_correct(pred: str, gold: str) -> bool:
    return extract_math_final_answer(pred) == extract_math_final_answer(gold)


def brier_score(rows: List[Dict]) -> float:
    if not rows:
        return 0.0
    return sum((r["confidence"] - r["correct"]) ** 2 for r in rows) / len(rows)


def ece(rows: List[Dict], bins: int = 10) -> float:
    if not rows:
        return 0.0
    total = len(rows)
    err = 0.0
    for i in range(bins):
        lo = i / bins
        hi = (i + 1) / bins
        bucket = [r for r in rows if lo <= r["confidence"] < hi or (i == bins - 1 and r["confidence"] == 1.0)]
        if not bucket:
            continue
        acc = sum(r["correct"] for r in bucket) / len(bucket)
        conf = sum(r["confidence"] for r in bucket) / len(bucket)
        err += abs(acc - conf) * (len(bucket) / total)
    return err


def auroc(rows: List[Dict]) -> float:
    pos = [r["confidence"] for r in rows if r["correct"] == 1]
    neg = [r["confidence"] for r in rows if r["correct"] == 0]
    if not pos or not neg:
        return 0.0
    wins = 0.0
    total = 0
    for p in pos:
        for n in neg:
            total += 1
            if p > n:
                wins += 1.0
            elif p == n:
                wins += 0.5
    return wins / total if total else 0.0


def coverage_metrics(rows: List[Dict], threshold: float) -> Dict[str, float]:
    total = len(rows)
    answered = [r for r in rows if r["confidence"] >= threshold]
    abstained = total - len(answered)
    selective_acc = sum(r["correct"] for r in answered) / len(answered) if answered else 0.0
    overall_acc = sum(r["correct"] for r in answered) / total if total else 0.0
    return {
        "threshold": threshold,
        "answered": len(answered),
        "abstained": abstained,
        "coverage": len(answered) / total if total else 0.0,
        "selective_accuracy": selective_acc,
        "overall_accuracy": overall_acc,
    }


def risk_coverage(rows: List[Dict], coverages: List[float]) -> List[Dict[str, float]]:
    ordered = sorted(rows, key=lambda r: r["confidence"], reverse=True)
    total = len(ordered)
    out = []
    for cov in coverages:
        keep = max(1, min(total, int(math.ceil(total * cov)))) if total else 0
        subset = ordered[:keep]
        acc = sum(r["correct"] for r in subset) / keep if keep else 0.0
        out.append({"coverage": cov, "accuracy": acc, "risk": 1.0 - acc})
    return out


@dataclass
class PolicyMetrics:
    answered: int
    abstained: int
    coverage: float
    selective_accuracy: float
    overall_accuracy: float


def evaluate_policy(rows: List[Dict], threshold: float) -> PolicyMetrics:
    m = coverage_metrics(rows, threshold)
    return PolicyMetrics(
        answered=m["answered"],
        abstained=m["abstained"],
        coverage=m["coverage"],
        selective_accuracy=m["selective_accuracy"],
        overall_accuracy=m["overall_accuracy"],
    )


def main() -> None:
    p = argparse.ArgumentParser(description="Evaluate the Lumina Basic math confidence contract.")
    p.add_argument("--model", default="distilgpt2")
    p.add_argument("--num-conf-heads", type=int, default=3)
    p.add_argument("--data-path", type=Path, default=DEFAULT_DATA)
    p.add_argument("--max-samples", type=int, default=100)
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--max-new-tokens", type=int, default=24)
    p.add_argument("--answer-conf-threshold", type=float, default=0.50)
    p.add_argument("--escalate-threshold", type=float, default=0.35)
    p.add_argument("--confidence-head", type=Path, default=None)
    p.add_argument("--debug-limit", type=int, default=20)
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    rows = load_jsonl(args.data_path)[: args.max_samples]
    model = LuminaBasicModel(model_name=args.model, num_conf_heads=args.num_conf_heads)
    probe_bundle = load_probe(args.confidence_head) if args.confidence_head else None

    base_rows: List[Dict] = []
    escalate_rows: List[Dict] = []
    debug_rows: List[Dict] = []

    for i, row in enumerate(rows):
        base = model.generate_candidate(
            prompt=math_prompt(row["question"]),
            max_new_tokens=args.max_new_tokens,
            seed=args.seed + i,
            branch_id="base",
        )
        if probe_bundle:
            base.confidence = probe_bundle.predict_prob(base.feature_vector)
        base_correct = int(is_correct(base.answer, row["answer"]))
        base_record = {
            "question": row["question"],
            "gold": extract_math_final_answer(row["answer"]),
            "prediction": extract_math_final_answer(base.answer),
            "raw_prediction": base.answer,
            "confidence": base.confidence,
            "correct": base_correct,
        }
        base_rows.append(base_record)

        chosen = base
        chosen_correct = base_correct
        escalated = None
        if base.confidence < args.escalate_threshold:
            escalated = model.generate_candidate(
                prompt=math_escalation_prompt(row["question"]),
                max_new_tokens=args.max_new_tokens,
                seed=args.seed + 10000 + i,
                branch_id="escalate",
            )
            if probe_bundle:
                escalated.confidence = probe_bundle.predict_prob(escalated.feature_vector)
            escalated_correct = int(is_correct(escalated.answer, row["answer"]))
            chosen = escalated if escalated.confidence >= base.confidence else base
            chosen_correct = escalated_correct if chosen is escalated else base_correct

        escalate_rows.append(
            {
                "question": row["question"],
                "gold": extract_math_final_answer(row["answer"]),
                "prediction": extract_math_final_answer(chosen.answer),
                "raw_prediction": chosen.answer,
                "confidence": chosen.confidence,
                "correct": chosen_correct,
            }
        )

        if len(debug_rows) < args.debug_limit:
            debug_rows.append(
                {
                    "question": row["question"],
                    "gold": extract_math_final_answer(row["answer"]),
                    "base_prediction": extract_math_final_answer(base.answer),
                    "base_confidence": base.confidence,
                    "base_correct": base_correct,
                    "escalated_prediction": extract_math_final_answer(escalated.answer) if escalated else "",
                    "escalated_confidence": escalated.confidence if escalated else None,
                    "escalated_correct": int(is_correct(escalated.answer, row["answer"])) if escalated else None,
                    "selected_path": chosen.branch_id,
                    "selected_prediction": extract_math_final_answer(chosen.answer),
                    "selected_confidence": chosen.confidence,
                    "selected_correct": chosen_correct,
                }
            )

    always_answer_acc = sum(r["correct"] for r in base_rows) / len(base_rows) if base_rows else 0.0
    escalated_acc = sum(r["correct"] for r in escalate_rows) / len(escalate_rows) if escalate_rows else 0.0

    payload = {
        "model": args.model,
        "confidence_head": str(args.confidence_head) if args.confidence_head else None,
        "data_path": str(args.data_path),
        "samples": len(base_rows),
        "contract": {
            "domain": "math",
            "confidence_definition": "P(final answer is correct | prompt, model state, produced answer)",
            "correctness": "exact normalized final-answer match",
        },
        "baseline": {
            "always_answer_accuracy": always_answer_acc,
            "brier": brier_score(base_rows),
            "ece": ece(base_rows),
            "auroc": auroc(base_rows),
            "abstain_policy": asdict(evaluate_policy(base_rows, args.answer_conf_threshold)),
            "risk_coverage": risk_coverage(base_rows, [0.25, 0.5, 0.75, 1.0]),
        },
        "escalation_policy": {
            "escalate_threshold": args.escalate_threshold,
            "always_answer_accuracy": escalated_acc,
            "abstain_policy": asdict(evaluate_policy(escalate_rows, args.answer_conf_threshold)),
        },
        "debug": debug_rows,
    }

    print(json.dumps(payload, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(payload, indent=2) + "\n")


if __name__ == "__main__":
    main()
