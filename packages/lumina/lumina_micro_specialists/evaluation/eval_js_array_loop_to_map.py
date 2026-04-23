import argparse
import json
import math
import random
from pathlib import Path

from lumina_basic.models.confidence_probe import load_probe

from lumina_micro_specialists.evaluation.verify_js_array_loop_to_map import verify_js_array_loop_to_map
from lumina_micro_specialists.runtime.router_js_array_loop_to_map import route_js_array_loop_to_map


def load_jsonl(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_transformers_model(model_name: str):
    from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

    tok = AutoTokenizer.from_pretrained(model_name)
    mdl = AutoModelForCausalLM.from_pretrained(model_name)
    return pipeline("text-generation", model=mdl, tokenizer=tok)


def strict_prompt(prompt: str) -> str:
    return (
        "You are a JavaScript refactoring specialist.\n"
        "Return only valid JavaScript.\n"
        "Preserve behavior.\n"
        "Use Array.prototype.map.\n"
        "Do not add explanation.\n\n"
        f"{prompt}\n"
    )


def extract_code(text: str) -> str:
    stripped = text.strip()
    if "```" in stripped:
        parts = stripped.split("```")
        for block in reversed(parts):
            block = block.strip()
            if block.startswith("js"):
                return block[2:].strip()
            if "const " in block or "let " in block or "for (" in block:
                return block.strip()
    return stripped


def generate_candidate(generator, row, max_new_tokens: int):
    out = generator(
        strict_prompt(row["prompt"]),
        max_new_tokens=max_new_tokens,
        do_sample=False,
        return_full_text=False,
    )[0]["generated_text"]
    return extract_code(out)


def contract_feature_vector(row: dict, candidate: str, route_confidence: float, verdict) -> list[float]:
    expected_var = row.get("expected_output_var", "")
    expected_array = row.get("expected_array_var", "")
    stripped = candidate.strip()
    lines = [line for line in stripped.splitlines() if line.strip()]
    has_binding = any(stripped.startswith(prefix) for prefix in ("const ", "let ", "var "))
    binds_expected = any(
        token in candidate for token in (f"const {expected_var}", f"let {expected_var}", f"var {expected_var}")
    )
    return [
        float(route_confidence),
        float(verdict.syntax_valid),
        float(verdict.uses_map),
        float(has_binding),
        float(binds_expected),
        float(f".map" in candidate),
        float("=>" in candidate),
        float(expected_array in candidate),
        float(stripped.endswith(";")),
        min(len(stripped) / 160.0, 1.0),
        min(len(lines) / 6.0, 1.0),
    ]


def heuristic_confidence(feature_vector: list[float]) -> float:
    score = (
        0.10
        + 0.15 * feature_vector[0]
        + 0.20 * feature_vector[1]
        + 0.15 * feature_vector[2]
        + 0.10 * feature_vector[3]
        + 0.15 * feature_vector[4]
        + 0.05 * feature_vector[7]
        + 0.05 * feature_vector[8]
    )
    return max(0.0, min(1.0, score))


def brier_score(rows):
    if not rows:
        return 0.0
    return sum((r["confidence"] - r["correct"]) ** 2 for r in rows) / len(rows)


def ece(rows, bins: int = 10):
    if not rows:
        return 0.0
    total = len(rows)
    err = 0.0
    for i in range(bins):
        lo = i / bins
        hi = (i + 1) / bins
        bucket = [r for r in rows if lo <= r["confidence"] < hi or (i == bins - 1 and r["confidence"] == 1.0)]
        if not bucket:
            continue
        acc = sum(r["correct"] for r in bucket) / len(bucket)
        conf = sum(r["confidence"] for r in bucket) / len(bucket)
        err += abs(acc - conf) * (len(bucket) / total)
    return err


def auroc(rows):
    pos = [r["confidence"] for r in rows if r["correct"] == 1]
    neg = [r["confidence"] for r in rows if r["correct"] == 0]
    if not pos or not neg:
        return 0.0
    wins = 0.0
    total = 0
    for p in pos:
        for n in neg:
            total += 1
            if p > n:
                wins += 1.0
            elif p == n:
                wins += 0.5
    return wins / total if total else 0.0


def coverage_metrics(rows, threshold: float):
    total = len(rows)
    answered = [r for r in rows if r["confidence"] >= threshold]
    return {
        "threshold": threshold,
        "answered": len(answered),
        "abstained": total - len(answered),
        "coverage": len(answered) / total if total else 0.0,
        "selective_accuracy": sum(r["correct"] for r in answered) / len(answered) if answered else 0.0,
        "overall_accuracy": sum(r["correct"] for r in answered) / total if total else 0.0,
    }


def risk_coverage(rows, coverages):
    ordered = sorted(rows, key=lambda r: r["confidence"], reverse=True)
    total = len(ordered)
    out = []
    for cov in coverages:
        keep = max(1, min(total, int(math.ceil(total * cov)))) if total else 0
        subset = ordered[:keep]
        acc = sum(r["correct"] for r in subset) / keep if keep else 0.0
        out.append({"coverage": cov, "accuracy": acc, "risk": 1.0 - acc})
    return out


def threshold_sweep(rows, thresholds):
    return [coverage_metrics(rows, t) for t in thresholds]


def main():
    p = argparse.ArgumentParser(description="Evaluate base-model baseline for js_array_loop_to_map.")
    p.add_argument("--dataset", type=Path, default=Path("lumina_micro_specialists/data/datasets/js_array_loop_to_map_v1/val.jsonl"))
    p.add_argument("--model", default=None)
    p.add_argument("--candidate-source", choices=["target", "input", "model"], default="target")
    p.add_argument("--max-samples", type=int, default=32)
    p.add_argument("--max-new-tokens", type=int, default=128)
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--confidence-head", type=Path, default=None)
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    rows = load_jsonl(args.dataset)
    rng = random.Random(args.seed)
    rng.shuffle(rows)
    rows = rows[: args.max_samples]

    generator = None
    probe_bundle = load_probe(args.confidence_head) if args.confidence_head else None
    if args.candidate_source == "model":
        if not args.model:
            raise SystemExit("--model is required when --candidate-source=model")
        generator = load_transformers_model(args.model)

    results = []
    routed = 0
    for row in rows:
        decision = route_js_array_loop_to_map(row["prompt"], row["input_code"])
        if decision.route != "js_array_loop_to_map":
            results.append(
                {
                    "id": row["id"],
                    "routed": False,
                    "correct": False,
                    "syntax_valid": False,
                    "uses_map": False,
                    "reason": decision.reason,
                }
            )
            continue
        routed += 1
        if args.candidate_source == "target":
            candidate = row["target_code"]
        elif args.candidate_source == "input":
            candidate = row["input_code"]
        else:
            candidate = generate_candidate(generator, row, args.max_new_tokens)
        verdict = verify_js_array_loop_to_map(candidate, row)
        feature_vector = contract_feature_vector(row, candidate, decision.route_confidence, verdict)
        confidence = probe_bundle.predict_prob(feature_vector) if probe_bundle else heuristic_confidence(feature_vector)
        results.append(
            {
                "id": row["id"],
                "routed": True,
                "correct": verdict.passed,
                "syntax_valid": verdict.syntax_valid,
                "uses_map": verdict.uses_map,
                "candidate": candidate,
                "route_confidence": decision.route_confidence,
                "confidence": confidence,
                "feature_vector": feature_vector,
                "details": verdict.details,
            }
        )

    total = len(results)
    payload = {
        "task_contract": "js_array_loop_to_map",
        "candidate_source": args.candidate_source,
        "model": args.model,
        "samples": total,
        "routed_rate": routed / total if total else 0.0,
        "pass_rate": sum(r["correct"] for r in results) / total if total else 0.0,
        "syntax_valid_rate": sum(r["syntax_valid"] for r in results) / total if total else 0.0,
        "uses_map_rate": sum(r["uses_map"] for r in results) / total if total else 0.0,
        "auroc": auroc(results),
        "ece": ece(results),
        "brier": brier_score(results),
        "risk_coverage": risk_coverage(results, [0.25, 0.5, 0.75, 1.0]),
        "threshold_sweep": threshold_sweep(results, [0.30, 0.40, 0.50, 0.60]),
        "rows": results,
    }
    print(json.dumps(payload, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
