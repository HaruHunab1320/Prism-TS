from __future__ import annotations

import argparse
import json
from pathlib import Path


def mean(xs: list[float]) -> float:
    return sum(xs) / max(1, len(xs))


def token_f1(a: str, b: str) -> float:
    ta = a.lower().split()
    tb = b.lower().split()
    if not ta or not tb:
        return 0.0
    counts = {}
    for t in tb:
        counts[t] = counts.get(t, 0) + 1
    common = 0
    for t in ta:
        if counts.get(t, 0) > 0:
            common += 1
            counts[t] -= 1
    if common == 0:
        return 0.0
    p = common / len(ta)
    r = common / len(tb)
    return 2 * p * r / (p + r)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--debug-jsonl", type=Path, required=True)
    args = parser.parse_args()

    rows = []
    with args.debug_jsonl.open() as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))

    if not rows:
        raise SystemExit("no rows found")

    selected_scores: list[float] = []
    oracle_scores: list[float] = []
    alt_lifts: list[float] = []
    overlaps: list[float] = []
    better_second = 0
    disagreeing_pairs = 0
    high_quality_disagree = 0

    for row in rows:
        selected_scores.append(row["domain_score"])
        candidates = row.get("candidates", [])
        if not candidates:
            oracle_scores.append(row["domain_score"])
            continue
        best = max(candidates, key=lambda c: c.get("oracle_target_conf", 0.0))
        # Also track best by realized task score proxy if present via selected row only.
        oracle_scores.append(max(row["domain_score"], max(c.get("quality", 0.0) for c in candidates)))
        if len(candidates) >= 2:
            c0, c1 = candidates[0], candidates[1]
            overlap = token_f1(c0["answer"], c1["answer"])
            overlaps.append(overlap)
            if overlap < 0.3:
                disagreeing_pairs += 1
                if c0.get("quality", 0.0) >= 0.4 and c1.get("quality", 0.0) >= 0.4:
                    high_quality_disagree += 1
            # Compare second candidate proxy against first candidate proxy.
            first_proxy = c0.get("quality", 0.0) + 0.05 * c0.get("ans_conf", 0.0)
            second_proxy = c1.get("quality", 0.0) + 0.05 * c1.get("ans_conf", 0.0)
            if second_proxy > first_proxy:
                better_second += 1
                alt_lifts.append(second_proxy - first_proxy)

    print(f"rows={len(rows)}")
    print(f"selected_task_proxy={mean(selected_scores):.3f}")
    print(f"oracle_task_proxy={mean(oracle_scores):.3f}")
    print(f"proxy_oracle_lift={mean(oracle_scores) - mean(selected_scores):.3f}")
    print(f"avg_answer_overlap_top2={mean(overlaps):.3f}")
    print(f"disagreeing_pairs={disagreeing_pairs}")
    print(f"high_quality_disagree={high_quality_disagree}")
    print(f"second_better_by_proxy={better_second}")
    print(f"avg_second_lift_when_better={mean(alt_lifts):.3f}")


if __name__ == "__main__":
    main()
