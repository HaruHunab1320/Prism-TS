from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
import torch.nn as nn


DOMAINS = ["general", "math", "code"]


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


def domain_one_hot(domain: str) -> list[float]:
    return [1.0 if domain == d else 0.0 for d in DOMAINS]


def load_rows(path: Path) -> list[dict]:
    rows = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def candidate_task(candidate: dict) -> float:
    return float(candidate.get("task_score", 0.0))


def selected_task(row: dict) -> float:
    return float(row.get("domain_score", row.get("selected", {}).get("task_score", 0.0)))


def candidate_features(c0: dict, c1: dict) -> list[float]:
    len0 = len(c0.get("answer", "").split())
    len1 = len(c1.get("answer", "").split())
    overlap = token_f1(c0.get("answer", ""), c1.get("answer", ""))
    feats = [
        float(c0.get("score", 0.0)),
        float(c1.get("score", 0.0)),
        float(c1.get("score", 0.0)) - float(c0.get("score", 0.0)),
        float(c0.get("ans_conf", 0.0)),
        float(c1.get("ans_conf", 0.0)),
        float(c1.get("ans_conf", 0.0)) - float(c0.get("ans_conf", 0.0)),
        float(c0.get("quality", 0.0)),
        float(c1.get("quality", 0.0)),
        float(c1.get("quality", 0.0)) - float(c0.get("quality", 0.0)),
        float(len0),
        float(len1),
        float(len1 - len0),
        overlap,
    ]
    feats.extend(domain_one_hot(str(c0.get("domain", ""))))
    feats.extend(domain_one_hot(str(c1.get("domain", ""))))
    return feats


def build_training_set(rows: list[dict]) -> tuple[torch.Tensor, torch.Tensor]:
    xs = []
    ys = []
    for row in rows:
        candidates = row.get("candidates", [])
        if len(candidates) < 2:
            continue
        c0, c1 = candidates[0], candidates[1]
        t0 = candidate_task(c0)
        t1 = candidate_task(c1)
        if abs(t1 - t0) < 1e-8:
            continue
        xs.append(candidate_features(c0, c1))
        ys.append(1.0 if t1 > t0 else 0.0)
    if not xs:
        raise SystemExit("no training rows with non-tied top-2 task scores")
    return torch.tensor(xs, dtype=torch.float32), torch.tensor(ys, dtype=torch.float32).unsqueeze(1)


def evaluate(model: nn.Module, mean_vec: torch.Tensor, std_vec: torch.Tensor, rows: list[dict]) -> dict[str, float]:
    selected_tasks = []
    selector_tasks = []
    oracle_tasks = []
    selected_success = []
    selector_success = []
    oracle_success = []
    pair_total = 0
    pair_correct = 0
    recover_num = 0.0
    recover_den = 0.0

    with torch.no_grad():
        for row in rows:
            candidates = row.get("candidates", [])
            if len(candidates) < 2:
                continue
            c0, c1 = candidates[0], candidates[1]
            sel_task = selected_task(row)
            t0 = candidate_task(c0)
            t1 = candidate_task(c1)
            oracle = max(t0, t1)
            feats = torch.tensor([candidate_features(c0, c1)], dtype=torch.float32)
            feats = (feats - mean_vec) / std_vec
            prob_second = torch.sigmoid(model(feats)).item()
            choose_second = prob_second >= 0.5
            selector_task = t1 if choose_second else t0

            selected_tasks.append(sel_task)
            selector_tasks.append(selector_task)
            oracle_tasks.append(oracle)
            selected_success.append(1.0 if sel_task >= 0.7 else 0.0)
            selector_success.append(1.0 if selector_task >= 0.7 else 0.0)
            oracle_success.append(1.0 if oracle >= 0.7 else 0.0)

            if abs(t1 - t0) >= 1e-8:
                pair_total += 1
                pair_correct += 1 if ((t1 > t0) == choose_second) else 0

            if oracle > sel_task:
                recover_num += selector_task - sel_task
                recover_den += oracle - sel_task

    return {
        "rows": float(len(selected_tasks)),
        "selected_task": mean(selected_tasks),
        "selector_task": mean(selector_tasks),
        "oracle_task": mean(oracle_tasks),
        "selector_task_lift": mean(selector_tasks) - mean(selected_tasks),
        "oracle_task_lift": mean(oracle_tasks) - mean(selected_tasks),
        "selected_success_at_0.7": mean(selected_success),
        "selector_success_at_0.7": mean(selector_success),
        "oracle_success_at_0.7": mean(oracle_success),
        "selector_success_lift": mean(selector_success) - mean(selected_success),
        "pair_accuracy": pair_correct / max(1, pair_total),
        "recoverable_rows": float(sum(1 for s, o in zip(selected_tasks, oracle_tasks) if o > s)),
        "recovered_oracle_share": recover_num / recover_den if recover_den > 0 else 0.0,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train-debug-jsonl", type=Path, required=True)
    parser.add_argument("--eval-debug-jsonl", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=200)
    parser.add_argument("--lr", type=float, default=1e-2)
    parser.add_argument("--hidden-size", type=int, default=32)
    args = parser.parse_args()

    train_rows = load_rows(args.train_debug_jsonl)
    eval_rows = load_rows(args.eval_debug_jsonl)
    x_train, y_train = build_training_set(train_rows)

    mean_vec = x_train.mean(dim=0, keepdim=True)
    std_vec = x_train.std(dim=0, keepdim=True).clamp(min=1e-6)
    x_train = (x_train - mean_vec) / std_vec

    model = nn.Sequential(
        nn.Linear(x_train.shape[1], args.hidden_size),
        nn.ReLU(),
        nn.Linear(args.hidden_size, 1),
    )
    pos = float(y_train.sum().item())
    neg = float(len(y_train) - pos)
    pos_weight = torch.tensor([neg / max(pos, 1.0)], dtype=torch.float32)
    loss_fn = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    opt = torch.optim.Adam(model.parameters(), lr=args.lr)

    for _ in range(args.epochs):
        logits = model(x_train)
        loss = loss_fn(logits, y_train)
        opt.zero_grad()
        loss.backward()
        opt.step()

    metrics = evaluate(model, mean_vec, std_vec, eval_rows)
    print(f"train_rows={len(train_rows)}")
    print(f"eval_rows={len(eval_rows)}")
    print(f"train_pairs={len(y_train)}")
    for key, value in metrics.items():
        if key.endswith("rows") or key == "train_pairs":
            print(f"{key}={int(value)}")
        else:
            print(f"{key}={value:.3f}")


if __name__ == "__main__":
    main()
