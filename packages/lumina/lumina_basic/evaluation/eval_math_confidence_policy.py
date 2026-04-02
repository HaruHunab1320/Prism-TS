from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List


def load_json(path: Path) -> Dict:
    return json.loads(path.read_text())


def find_threshold_row(rows: List[Dict], threshold: float) -> Dict:
    for row in rows:
        if abs(float(row.get("threshold", -1.0)) - threshold) < 1e-9:
            return row
    raise ValueError(f"Threshold {threshold} not found in sweep.")


def main() -> None:
    p = argparse.ArgumentParser(description="Evaluate a fixed Lumina Basic math confidence policy.")
    p.add_argument("--eval-json", type=Path, default=Path("lumina_basic/notes/math_confidence_latest.json"))
    p.add_argument("--mode", choices=["baseline", "escalation"], default="baseline")
    p.add_argument("--threshold", type=float, default=0.15)
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    payload = load_json(args.eval_json)
    baseline = payload["baseline"]
    section = baseline if args.mode == "baseline" else payload["escalation_policy"]
    row = find_threshold_row(section.get("threshold_sweep", []), args.threshold)

    summary = {
        "eval_json": str(args.eval_json),
        "mode": args.mode,
        "threshold": args.threshold,
        "always_answer_accuracy": baseline["always_answer_accuracy"],
        "coverage": row["coverage"],
        "answered": row["answered"],
        "abstained": row["abstained"],
        "selective_accuracy": row["selective_accuracy"],
        "overall_accuracy": row["overall_accuracy"],
        "gain_vs_always_answer": row["selective_accuracy"] - baseline["always_answer_accuracy"],
    }

    print(json.dumps(summary, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(summary, indent=2) + "\n")


if __name__ == "__main__":
    main()
