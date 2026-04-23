from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def summarize(values: list[float]) -> dict[str, float]:
    if not values:
        return {"mean": 0.0, "min": 0.0, "max": 0.0}
    return {
        "mean": statistics.fmean(values),
        "min": min(values),
        "max": max(values),
    }


def main() -> None:
    p = argparse.ArgumentParser(description="Summarize fixed-threshold js_array_loop_to_map policy stability.")
    p.add_argument("policy_json", nargs="+", type=Path)
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    rows = [load_json(path) for path in args.policy_json]
    summary = {
        "runs": len(rows),
        "threshold": rows[0]["threshold"] if rows else None,
        "mode": rows[0]["mode"] if rows else None,
        "coverage": summarize([float(r["coverage"]) for r in rows]),
        "selective_accuracy": summarize([float(r["selective_accuracy"]) for r in rows]),
        "overall_accuracy": summarize([float(r["overall_accuracy"]) for r in rows]),
        "gain_vs_always_answer": summarize([float(r["gain_vs_always_answer"]) for r in rows]),
        "always_answer_accuracy": summarize([float(r["always_answer_accuracy"]) for r in rows]),
        "artifacts": [str(path) for path in args.policy_json],
    }

    print(json.dumps(summary, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(summary, indent=2) + "\n")


if __name__ == "__main__":
    main()
