from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from lumina_basic.models.confidence_probe import ConfidenceProbe, save_probe
from lumina_micro_specialists.evaluation.eval_js_array_loop_to_map import (
    auroc,
    brier_score,
    contract_feature_vector,
    ece,
    generate_candidate,
    load_jsonl,
    load_transformers_model,
)
from lumina_micro_specialists.evaluation.verify_js_array_loop_to_map import verify_js_array_loop_to_map
from lumina_micro_specialists.runtime.router_js_array_loop_to_map import route_js_array_loop_to_map


def collect_rows(generator, rows: list[dict], max_new_tokens: int) -> list[dict]:
    out = []
    for row in rows:
        decision = route_js_array_loop_to_map(row["prompt"], row["input_code"])
        if decision.route != "js_array_loop_to_map":
            continue
        candidate = generate_candidate(generator, row, max_new_tokens)
        verdict = verify_js_array_loop_to_map(candidate, row)
        out.append(
            {
                "feature_vector": contract_feature_vector(row, candidate, decision.route_confidence, verdict),
                "correct": int(verdict.passed),
            }
        )
    return out


def rows_to_tensors(rows: list[dict]) -> tuple[torch.Tensor, torch.Tensor]:
    x = torch.tensor([r["feature_vector"] for r in rows], dtype=torch.float32)
    y = torch.tensor([r["correct"] for r in rows], dtype=torch.float32)
    return x, y


def evaluate_probe(probe: ConfidenceProbe, x: torch.Tensor, y: torch.Tensor) -> dict:
    with torch.no_grad():
        probs = torch.sigmoid(probe(x))
    rows = [{"confidence": probs[i].item(), "correct": int(y[i].item())} for i in range(len(y))]
    return {
        "accuracy_at_0_5": sum(int((r["confidence"] >= 0.5) == bool(r["correct"])) for r in rows) / max(len(rows), 1),
        "auroc": auroc(rows),
        "ece": ece(rows),
        "brier": brier_score(rows),
        "mean_confidence": sum(r["confidence"] for r in rows) / max(len(rows), 1),
        "positive_rate": sum(r["correct"] for r in rows) / max(len(rows), 1),
    }


def main() -> None:
    p = argparse.ArgumentParser(description="Train a confidence probe for js_array_loop_to_map.")
    p.add_argument("--train-dataset", type=Path, default=Path("lumina_micro_specialists/data/datasets/js_array_loop_to_map_v1/train.jsonl"))
    p.add_argument("--val-dataset", type=Path, default=Path("lumina_micro_specialists/data/datasets/js_array_loop_to_map_v1/val.jsonl"))
    p.add_argument("--model", required=True)
    p.add_argument("--max-train-samples", type=int, default=256)
    p.add_argument("--max-val-samples", type=int, default=64)
    p.add_argument("--max-new-tokens", type=int, default=96)
    p.add_argument("--epochs", type=int, default=40)
    p.add_argument("--batch-size", type=int, default=64)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--hidden-dim", type=int, default=16)
    p.add_argument("--output", type=Path, default=Path("lumina_micro_specialists/outputs/js_array_loop_to_map_confidence_probe.pt"))
    p.add_argument("--metrics-json", type=Path, default=Path("lumina_micro_specialists/notes/js_array_loop_to_map_confidence_probe_latest.json"))
    args = p.parse_args()

    train_rows = load_jsonl(args.train_dataset)[: args.max_train_samples]
    val_rows = load_jsonl(args.val_dataset)[: args.max_val_samples]
    generator = load_transformers_model(args.model)

    train_examples = collect_rows(generator, train_rows, args.max_new_tokens)
    val_examples = collect_rows(generator, val_rows, args.max_new_tokens)
    if not train_examples or not val_examples:
        raise SystemExit("Not enough routed examples to train/evaluate the probe.")

    x_train, y_train = rows_to_tensors(train_examples)
    x_val, y_val = rows_to_tensors(val_examples)

    mean = x_train.mean(dim=0)
    std = x_train.std(dim=0)
    std = torch.where(std < 1e-6, torch.ones_like(std), std)
    x_train = (x_train - mean) / std
    x_val = (x_val - mean) / std

    probe = ConfidenceProbe(input_dim=x_train.shape[1], hidden_dim=args.hidden_dim)
    opt = torch.optim.AdamW(probe.parameters(), lr=args.lr)
    loss_fn = nn.BCEWithLogitsLoss()
    loader = DataLoader(TensorDataset(x_train, y_train), batch_size=args.batch_size, shuffle=True)

    history = []
    for epoch in range(1, args.epochs + 1):
        probe.train()
        total_loss = 0.0
        for xb, yb in loader:
            opt.zero_grad()
            logits = probe(xb)
            loss = loss_fn(logits, yb)
            loss.backward()
            opt.step()
            total_loss += loss.item() * xb.shape[0]
        probe.eval()
        history.append(
            {
                "epoch": epoch,
                "train_loss": total_loss / max(len(x_train), 1),
                "train": evaluate_probe(probe, x_train, y_train),
                "val": evaluate_probe(probe, x_val, y_val),
            }
        )

    save_probe(
        args.output,
        probe,
        mean,
        std,
        metadata={
            "task_contract": "js_array_loop_to_map",
            "model": args.model,
            "train_samples": len(train_examples),
            "val_samples": len(val_examples),
            "max_new_tokens": args.max_new_tokens,
        },
    )

    payload = {
        "task_contract": "js_array_loop_to_map",
        "model": args.model,
        "train_samples": len(train_examples),
        "val_samples": len(val_examples),
        "feature_dim": int(x_train.shape[1]),
        "output": str(args.output),
        "final": history[-1] if history else {},
        "history_tail": history[-5:],
    }
    args.metrics_json.parent.mkdir(parents=True, exist_ok=True)
    args.metrics_json.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
