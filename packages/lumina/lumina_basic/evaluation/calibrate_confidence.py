#!/usr/bin/env python3
"""
Post-hoc temperature scaling for confidence outputs.
Fits a scalar temperature to minimize NLL of correctness labels.
"""

import argparse
import json
from pathlib import Path
from typing import Dict

import numpy as np
from sklearn.metrics import log_loss
from scipy.optimize import minimize


def load_json(path: Path) -> Dict:
    with path.open() as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True, help="JSON with confidences + correctness")
    parser.add_argument("--output", type=Path, required=True, help="Output JSON with temperature")
    args = parser.parse_args()

    data = load_json(args.input)
    conf = np.array(data["confidences"], dtype=float)
    # Prefer continuous target_conf if available
    if "target_conf" in data and len(data["target_conf"]) == len(conf):
        y = np.array(data["target_conf"], dtype=float)
    else:
        # Use F1-based correctness if exact-match is all zeros, then overlap/weak fallback
        if "f1" in data and sum(data["correct"]) == 0:
            y = np.array([1.0 if v >= 0.5 else 0.0 for v in data["f1"]], dtype=float)
        elif "overlap" in data and sum(data["correct"]) == 0:
            y = np.array(data["overlap"], dtype=float)
        elif "weak_correct" in data and sum(data["correct"]) == 0:
            y = np.array(data["weak_correct"], dtype=float)
        else:
            y = np.array(data["correct"], dtype=float)

    conf = np.clip(conf, 1e-5, 1 - 1e-5)

    def objective(t):
        t = t[0]
        scaled = 1 / (1 + np.exp(-np.log(conf / (1 - conf)) / t))
        # Binary classification if labels are exactly {0,1}
        unique = set(np.round(y, 6).tolist())
        if unique.issubset({0.0, 1.0}) and len(unique) >= 2:
            return log_loss(y, scaled, labels=[0.0, 1.0])
        # Continuous target: use MSE
        return np.mean((scaled - y) ** 2)

    # Determine mode for reporting
    unique = set(np.round(y, 6).tolist())
    mode = "binary" if unique.issubset({0.0, 1.0}) and len(unique) >= 2 else "regression"

    res = minimize(objective, x0=np.array([1.0]), bounds=[(0.5, 10.0)])
    t_opt = float(res.x[0])

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w") as f:
        json.dump({"temperature": t_opt}, f, indent=2)

    print(f"Mode: {mode}")
    print(f"Temperature: {t_opt:.4f}")


if __name__ == "__main__":
    main()
