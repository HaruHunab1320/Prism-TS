from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def find_threshold_row(rows: list[dict], threshold: float) -> dict:
    for row in rows:
        if abs(float(row.get("threshold", -1.0)) - threshold) < 1e-9:
            return row
    raise ValueError(f"Threshold {threshold} not found in sweep.")


def main() -> None:
    p = argparse.ArgumentParser(description="Evaluate a fixed js_reduce_accumulator_refactor confidence policy.")
    p.add_argument("--eval-json", type=Path, required=True)
    p.add_argument("--threshold", type=float, default=0.40)
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    payload = load_json(args.eval_json)
    row = find_threshold_row(payload["threshold_sweep"], args.threshold)

    summary = {
        "eval_json": str(args.eval_json),
        "task_contract": payload.get("task_contract"),
        "mode": "baseline_selective",
        "threshold": args.threshold,
        "always_answer_accuracy": payload["pass_rate"],
        "coverage": row["coverage"],
        "answered": row["answered"],
        "abstained": row["abstained"],
        "selective_accuracy": row["selective_accuracy"],
        "overall_accuracy": row["overall_accuracy"],
        "gain_vs_always_answer": row["selective_accuracy"] - payload["pass_rate"],
    }

    print(json.dumps(summary, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(summary, indent=2) + "\n")


if __name__ == "__main__":
    main()
