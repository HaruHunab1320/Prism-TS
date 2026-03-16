from __future__ import annotations

import argparse
import json
from pathlib import Path


def token_f1(a: str, b: str) -> float:
    ta = a.lower().split()
    tb = b.lower().split()
    if not ta or not tb:
        return 0.0
    common = 0
    tb_counts = {}
    for t in tb:
        tb_counts[t] = tb_counts.get(t, 0) + 1
    for t in ta:
        c = tb_counts.get(t, 0)
        if c > 0:
            common += 1
            tb_counts[t] = c - 1
    if common == 0:
        return 0.0
    precision = common / len(ta)
    recall = common / len(tb)
    return 2 * precision * recall / (precision + recall)


def load_rows(path: Path) -> dict[tuple[str, str, str], dict]:
    rows = {}
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            key = (row["true_domain"], row["question"], row["gold"])
            rows[key] = row
    return rows


def mean(xs: list[float]) -> float:
    return sum(xs) / max(1, len(xs))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-debug", type=Path, required=True)
    parser.add_argument("--current-debug", type=Path, required=True)
    parser.add_argument("--oracle-debug", type=Path, required=True)
    parser.add_argument("--min-ans-conf", type=float, default=0.40)
    parser.add_argument("--max-overlap", type=float, default=0.30)
    args = parser.parse_args()

    baseline = load_rows(args.baseline_debug)
    current = load_rows(args.current_debug)
    oracle = load_rows(args.oracle_debug)

    subset = []
    baseline_scores = []
    current_scores = []
    oracle_scores = []
    baseline_success = []
    current_success = []
    oracle_success = []

    for key, row in oracle.items():
        if key not in baseline or key not in current:
            continue
        candidates = row.get("candidates", [])
        if len(candidates) < 2:
            continue
        c0, c1 = candidates[0], candidates[1]
        if c0["ans_conf"] < args.min_ans_conf or c1["ans_conf"] < args.min_ans_conf:
            continue
        overlap = token_f1(c0["answer"], c1["answer"])
        if overlap >= args.max_overlap:
            continue

        subset.append(
            {
                "key": key,
                "overlap": overlap,
                "ans_conf_0": c0["ans_conf"],
                "ans_conf_1": c1["ans_conf"],
            }
        )
        baseline_ds = baseline[key]["domain_score"]
        current_ds = current[key]["domain_score"]
        oracle_ds = row["domain_score"]
        baseline_scores.append(baseline_ds)
        current_scores.append(current_ds)
        oracle_scores.append(oracle_ds)
        baseline_success.append(1.0 if baseline_ds >= 0.7 else 0.0)
        current_success.append(1.0 if current_ds >= 0.7 else 0.0)
        oracle_success.append(1.0 if oracle_ds >= 0.7 else 0.0)

    print(f"subset_size={len(subset)}")
    print(f"min_ans_conf={args.min_ans_conf}")
    print(f"max_overlap={args.max_overlap}")
    print(f"baseline_task={mean(baseline_scores):.3f}")
    print(f"current_task={mean(current_scores):.3f}")
    print(f"oracle_task={mean(oracle_scores):.3f}")
    print(f"current_lift={mean(current_scores) - mean(baseline_scores):.3f}")
    print(f"oracle_lift={mean(oracle_scores) - mean(baseline_scores):.3f}")
    print(f"baseline_success={mean(baseline_success):.3f}")
    print(f"current_success={mean(current_success):.3f}")
    print(f"oracle_success={mean(oracle_success):.3f}")


if __name__ == "__main__":
    main()
