#!/usr/bin/env python3
"""
Fit a simple linear calibration (a*conf + b) per domain using val data.
Targets are the model's gold-answer likelihood (target_conf).
Outputs JSON: {domain: {"a": ..., "b": ...}, ...}
"""

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from transformers import GPT2Tokenizer

from models.gpt2_confidence import GPT2WithConfidence
from evaluation.eval_aggregator_minimal import prompt_conf, target_conf
from training.train_router import load_jsonl


def fit_linear(xs, ys):
    if len(xs) == 0:
        return 1.0, 0.0
    x = np.asarray(xs, dtype=np.float64)
    y = np.asarray(ys, dtype=np.float64)
    A = np.vstack([x, np.ones_like(x)]).T
    a, b = np.linalg.lstsq(A, y, rcond=None)[0]
    return float(a), float(b)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    p.add_argument("--domains", nargs="+", default=["general", "math", "code"])
    p.add_argument("--weights", nargs="+", required=True)
    p.add_argument("--max-samples", type=int, default=1000)
    p.add_argument("--output", type=Path, default=Path("outputs_gpt2/conf_calibration.json"))
    args = p.parse_args()

    if len(args.domains) != len(args.weights):
        raise SystemExit("domains and weights must match")

    tok = GPT2Tokenizer.from_pretrained("gpt2")
    tok.pad_token = tok.eos_token
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

    out = {}
    for domain, w in zip(args.domains, args.weights):
        rows = load_jsonl(args.data_root / f"{domain}_specialist" / "val.jsonl")[: args.max_samples]
        model = GPT2WithConfidence("gpt2")
        model.load_state_dict(torch.load(Path(w), map_location="cpu"))
        model.eval().to(device)

        confs = []
        targets = []
        for r in rows:
            q = r["question"]
            a = r["answer"]
            c = prompt_conf(model, tok, q, device)
            t = target_conf(model, tok, q, a, device)
            confs.append(c)
            targets.append(t)

        a, b = fit_linear(confs, targets)
        out[domain] = {"a": a, "b": b}
        print(f"{domain}: a={a:.3f} b={b:.3f} (n={len(confs)})")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w") as f:
        json.dump(out, f, indent=2)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
