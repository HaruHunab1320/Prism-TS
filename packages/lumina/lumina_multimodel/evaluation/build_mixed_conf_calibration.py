#!/usr/bin/env python3
"""
Build per-domain linear confidence calibration for mixed generator backbones.

Fits: calibrated_conf = a * raw_conf + b
Target is per-sample domain_score(pred, gold, domain) from generated answers.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch

from evaluation.eval_aggregator_minimal import (
    domain_score,
    generate_answer,
    get_tokenizer,
    load_generator_model,
    load_generator_tokenizer,
    resolve_device,
)
from models.gpt2_confidence import GPT2WithConfidence
from training.train_router import load_jsonl


def fit_linear(xs, ys):
    if len(xs) == 0:
        return 1.0, 0.0
    x = np.asarray(xs, dtype=np.float64)
    y = np.asarray(ys, dtype=np.float64)
    A = np.vstack([x, np.ones_like(x)]).T
    a, b = np.linalg.lstsq(A, y, rcond=None)[0]
    return float(a), float(b)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--data-root", type=Path, required=True)
    p.add_argument("--domains", nargs="+", default=["general", "math", "code"])
    p.add_argument("--weights", nargs="+", required=True, help="confidence head checkpoints")
    p.add_argument("--generator-domain-weights", nargs="+", required=True)
    p.add_argument("--max-samples", type=int, default=120)
    p.add_argument("--max-new-tokens", type=int, default=24)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args()

    if len(args.domains) != len(args.weights):
        raise SystemExit("domains and weights length mismatch")
    if len(args.domains) != len(args.generator_domain_weights):
        raise SystemExit("domains and generator-domain-weights length mismatch")

    random.seed(args.seed)
    device = resolve_device()
    conf_tok = get_tokenizer("gpt2")

    experts = []
    generators = []
    gen_toks = []
    for w, gw in zip(args.weights, args.generator_domain_weights):
        m = GPT2WithConfidence("gpt2")
        m.load_state_dict(torch.load(Path(w), map_location="cpu"))
        m.eval().to(device)
        experts.append(m)
        g = load_generator_model(gw).eval().to(device)
        gt = load_generator_tokenizer(gw)
        generators.append(g)
        gen_toks.append(gt)

    out = {}
    for i, domain in enumerate(args.domains):
        rows = load_jsonl(args.data_root / f"{domain}_specialist" / "val.jsonl")
        random.shuffle(rows)
        rows = rows[: args.max_samples]

        confs = []
        targets = []
        for r in rows:
            q = r["question"]
            gold = r["answer"]
            pred, raw_conf = generate_answer(
                generators[i],
                gen_toks[i],
                experts[i],
                conf_tok,
                q,
                domain,
                device,
                max_new_tokens=args.max_new_tokens,
                calib=None,
            )
            confs.append(float(raw_conf))
            targets.append(float(domain_score(pred, gold, domain)))

        a, b = fit_linear(confs, targets)
        out[domain] = {"a": a, "b": b}
        print(f"{domain}: a={a:.3f} b={b:.3f} n={len(rows)}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w") as f:
        json.dump(out, f, indent=2)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
