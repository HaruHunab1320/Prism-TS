from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List


def load_json(path: Path) -> Dict:
    return json.loads(path.read_text())


def choose_best(
    rows: List[Dict],
    min_coverage: float,
    min_gain: float,
    baseline_accuracy: float,
) -> Dict | None:
    eligible = []
    for row in rows:
        coverage = float(row.get("coverage", 0.0))
        selective = float(row.get("selective_accuracy", 0.0))
        gain = selective - baseline_accuracy
        if coverage >= min_coverage and gain >= min_gain:
            item = dict(row)
            item["gain_vs_always_answer"] = gain
            eligible.append(item)
    if not eligible:
        return None
    eligible.sort(
        key=lambda r: (
            r["gain_vs_always_answer"],
            r["coverage"],
            -float(r["threshold"]),
        ),
        reverse=True,
    )
    return eligible[0]


def main() -> None:
    p = argparse.ArgumentParser(description="Select an operating threshold for the Lumina Basic math confidence policy.")
    p.add_argument("--eval-json", type=Path, required=True)
    p.add_argument("--min-coverage", type=float, default=0.25)
    p.add_argument("--min-gain", type=float, default=0.02)
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    payload = load_json(args.eval_json)
    baseline = payload["baseline"]
    escalation = payload["escalation_policy"]
    always_answer_accuracy = float(baseline["always_answer_accuracy"])

    baseline_choice = choose_best(
        baseline.get("threshold_sweep", []),
        min_coverage=args.min_coverage,
        min_gain=args.min_gain,
        baseline_accuracy=always_answer_accuracy,
    )
    escalation_choice = choose_best(
        escalation.get("threshold_sweep", []),
        min_coverage=args.min_coverage,
        min_gain=args.min_gain,
        baseline_accuracy=always_answer_accuracy,
    )

    summary = {
        "eval_json": str(args.eval_json),
        "always_answer_accuracy": always_answer_accuracy,
        "constraints": {
            "min_coverage": args.min_coverage,
            "min_gain_vs_always_answer": args.min_gain,
        },
        "baseline_policy_choice": baseline_choice,
        "escalation_policy_choice": escalation_choice,
        "recommended_policy": None,
    }

    candidates = [c for c in (baseline_choice, escalation_choice) if c is not None]
    if candidates:
        candidates.sort(
            key=lambda r: (r["gain_vs_always_answer"], r["coverage"]),
            reverse=True,
        )
        best = candidates[0]
        mode = "baseline_selective" if best is baseline_choice else "escalation_selective"
        summary["recommended_policy"] = {"mode": mode, **best}

    print(json.dumps(summary, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(summary, indent=2) + "\n")


if __name__ == "__main__":
    main()
