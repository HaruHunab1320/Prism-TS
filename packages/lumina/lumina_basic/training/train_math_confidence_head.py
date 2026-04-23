from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from lumina_basic.evaluation.eval_math_confidence import (
    DEFAULT_DATA,
    auroc,
    brier_score,
    ece,
    is_correct,
    load_jsonl,
    math_contract_features,
    math_prompt,
)
from lumina_basic.models.confidence_model import LuminaBasicModel
from lumina_basic.models.confidence_probe import ConfidenceProbe, save_probe


DEFAULT_TRAIN = Path("lumina_multimodel/datasets_hq_v2_curated/math_specialist/train.jsonl")


def collect_rows(
    model: LuminaBasicModel,
    rows: List[Dict],
    max_new_tokens: int,
    seed: int,
    use_math_contract_features: bool,
) -> List[Dict]:
    out = []
    for i, row in enumerate(rows):
        cand = model.generate_candidate(
            prompt=math_prompt(row["question"]),
            max_new_tokens=max_new_tokens,
            seed=seed + i,
            branch_id="train",
        )
        out.append(
            {
                "feature_vector": (
                    list(cand.feature_vector) + math_contract_features(cand.answer)
                    if use_math_contract_features
                    else list(cand.feature_vector)
                ),
                "correct": int(is_correct(cand.answer, row["answer"])),
                "heuristic_confidence": cand.confidence,
            }
        )
    return out


def rows_to_tensors(rows: List[Dict]) -> tuple[torch.Tensor, torch.Tensor]:
    x = torch.tensor([r["feature_vector"] for r in rows], dtype=torch.float32)
    y = torch.tensor([r["correct"] for r in rows], dtype=torch.float32)
    return x, y


def evaluate_probe(probe: ConfidenceProbe, x: torch.Tensor, y: torch.Tensor) -> Dict:
    with torch.no_grad():
        logits = probe(x)
        probs = torch.sigmoid(logits)
    rows = [
        {"confidence": probs[i].item(), "correct": int(y[i].item())}
        for i in range(len(y))
    ]
    return {
        "accuracy_at_0_5": sum(int((r["confidence"] >= 0.5) == bool(r["correct"])) for r in rows) / max(len(rows), 1),
        "brier": brier_score(rows),
        "ece": ece(rows),
        "auroc": auroc(rows),
        "mean_confidence": sum(r["confidence"] for r in rows) / max(len(rows), 1),
        "positive_rate": sum(r["correct"] for r in rows) / max(len(rows), 1),
    }


def main() -> None:
    p = argparse.ArgumentParser(description="Train a learned math confidence head for lumina_basic.")
    p.add_argument("--model", default="distilgpt2")
    p.add_argument("--num-conf-heads", type=int, default=3)
    p.add_argument("--train-data", type=Path, default=DEFAULT_TRAIN)
    p.add_argument("--val-data", type=Path, default=DEFAULT_DATA)
    p.add_argument("--max-train-samples", type=int, default=2000)
    p.add_argument("--max-val-samples", type=int, default=400)
    p.add_argument("--max-new-tokens", type=int, default=24)
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--epochs", type=int, default=20)
    p.add_argument("--batch-size", type=int, default=64)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--hidden-dim", type=int, default=16)
    p.add_argument("--math-contract-features", action="store_true")
    p.add_argument("--output", type=Path, default=Path("lumina_basic/outputs/math_confidence_probe.pt"))
    p.add_argument("--metrics-json", type=Path, default=Path("lumina_basic/notes/math_confidence_probe_latest.json"))
    args = p.parse_args()

    train_rows = load_jsonl(args.train_data)[: args.max_train_samples]
    val_rows = load_jsonl(args.val_data)[: args.max_val_samples]

    model = LuminaBasicModel(model_name=args.model, num_conf_heads=args.num_conf_heads)
    train_examples = collect_rows(model, train_rows, args.max_new_tokens, args.seed, args.math_contract_features)
    val_examples = collect_rows(model, val_rows, args.max_new_tokens, args.seed + 50000, args.math_contract_features)

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
        train_metrics = evaluate_probe(probe, x_train, y_train)
        val_metrics = evaluate_probe(probe, x_val, y_val)
        history.append(
            {
                "epoch": epoch,
                "train_loss": total_loss / max(len(x_train), 1),
                "train": train_metrics,
                "val": val_metrics,
            }
        )

    save_probe(
        args.output,
        probe,
        mean,
        std,
        metadata={
            "model": args.model,
            "num_conf_heads": args.num_conf_heads,
            "train_samples": len(train_examples),
            "val_samples": len(val_examples),
            "max_new_tokens": args.max_new_tokens,
            "math_contract_features": bool(args.math_contract_features),
        },
    )

    payload = {
        "model": args.model,
        "train_samples": len(train_examples),
        "val_samples": len(val_examples),
        "feature_dim": int(x_train.shape[1]),
        "math_contract_features": bool(args.math_contract_features),
        "final": history[-1] if history else {},
        "history_tail": history[-5:],
        "output": str(args.output),
    }
    args.metrics_json.parent.mkdir(parents=True, exist_ok=True)
    args.metrics_json.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
