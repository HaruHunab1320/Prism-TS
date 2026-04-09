from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from lumina_basic.evaluation.eval_code_confidence import (
    DEFAULT_FIXTURE_ROOT,
    auroc,
    brier_score,
    build_test_script,
    code_contract_features,
    ece,
    generate_code,
    load_model,
    load_rows,
    resolve_device,
    run_script,
    syntax_valid,
    assemble_candidate,
)
from lumina_basic.models.confidence_probe import ConfidenceProbe, save_probe


def collect_rows(
    model,
    tokenizer,
    rows: List[Dict],
    device: torch.device,
    max_new_tokens: int,
    timeout_sec: float,
    strict_code_contract: bool,
) -> List[Dict]:
    out = []
    for row in rows:
        pred, avg_logprob, avg_entropy = generate_code(
            model=model,
            tokenizer=tokenizer,
            row=row,
            device=device,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            temperature=0.0,
            top_p=1.0,
            strict_contract=strict_code_contract,
        )
        candidate = assemble_candidate(row, pred)
        syntactic = syntax_valid(candidate)
        passed = False
        if syntactic:
            passed, _ = run_script(build_test_script(row, candidate), timeout_sec)
        out.append(
            {
                "feature_vector": code_contract_features(
                    row=row,
                    raw_answer=pred,
                    candidate_code=candidate,
                    avg_logprob=avg_logprob,
                    avg_entropy=avg_entropy,
                    syntactic=syntactic,
                ),
                "correct": int(passed),
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
    p = argparse.ArgumentParser(description="Train a learned code confidence head for lumina_basic.")
    p.add_argument("--model", required=True)
    p.add_argument("--benchmark", choices=["mbpp", "humaneval", "both"], default="both")
    p.add_argument("--fixture-root", type=Path, default=DEFAULT_FIXTURE_ROOT)
    p.add_argument("--max-train-samples", type=int, default=100)
    p.add_argument("--max-val-samples", type=int, default=100)
    p.add_argument("--max-new-tokens", type=int, default=128)
    p.add_argument("--timeout-sec", type=float, default=4.0)
    p.add_argument("--device", default="")
    p.add_argument("--strict-code-contract", action="store_true")
    p.add_argument("--epochs", type=int, default=30)
    p.add_argument("--batch-size", type=int, default=64)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--hidden-dim", type=int, default=16)
    p.add_argument("--output", type=Path, default=Path("lumina_basic/outputs/code_confidence_probe.pt"))
    p.add_argument("--metrics-json", type=Path, default=Path("lumina_basic/notes/code_confidence_probe_latest.json"))
    args = p.parse_args()

    device = resolve_device(args.device)
    model, tokenizer = load_model(args.model)
    model.to(device).eval()

    all_rows = load_rows(args.fixture_root, args.benchmark, args.max_train_samples + args.max_val_samples)
    train_rows = all_rows[: args.max_train_samples]
    val_rows = all_rows[args.max_train_samples : args.max_train_samples + args.max_val_samples]
    if not val_rows:
        raise SystemExit("Not enough benchmark rows to form a held-out validation split.")

    train_examples = collect_rows(
        model=model,
        tokenizer=tokenizer,
        rows=train_rows,
        device=device,
        max_new_tokens=args.max_new_tokens,
        timeout_sec=args.timeout_sec,
        strict_code_contract=args.strict_code_contract,
    )
    val_examples = collect_rows(
        model=model,
        tokenizer=tokenizer,
        rows=val_rows,
        device=device,
        max_new_tokens=args.max_new_tokens,
        timeout_sec=args.timeout_sec,
        strict_code_contract=args.strict_code_contract,
    )

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
            "benchmark": args.benchmark,
            "train_samples": len(train_examples),
            "val_samples": len(val_examples),
            "max_new_tokens": args.max_new_tokens,
            "strict_code_contract": bool(args.strict_code_contract),
        },
    )

    payload = {
        "model": args.model,
        "benchmark": args.benchmark,
        "train_samples": len(train_examples),
        "val_samples": len(val_examples),
        "feature_dim": int(x_train.shape[1]),
        "strict_code_contract": bool(args.strict_code_contract),
        "final": history[-1] if history else {},
        "history_tail": history[-5:],
        "output": str(args.output),
    }
    args.metrics_json.parent.mkdir(parents=True, exist_ok=True)
    args.metrics_json.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
