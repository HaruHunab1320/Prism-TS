from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

from lumina_basic.evaluation.eval_math_confidence import (
    DEFAULT_DATA,
    auroc,
    brier_score,
    ece,
    evaluate_policy,
    extract_math_final_answer,
    is_correct,
    load_jsonl,
    math_prompt,
    risk_coverage,
    threshold_sweep,
)
from lumina_basic.models.confidence_model import LuminaBasicModel
from lumina_basic.models.confidence_probe import load_probe


def structured_verification_prompt(question: str, draft_answer: str) -> str:
    draft = extract_math_final_answer(draft_answer)
    return (
        "Verify the draft answer carefully. Solve again if needed. "
        "End with a single line formatted exactly as 'Final answer: <number>'.\n"
        f"Question: {question}\n"
        f"Draft answer: {draft or draft_answer.strip()}\n"
        "Verification:\n"
    )


def main() -> None:
    p = argparse.ArgumentParser(description="Evaluate Lumina Basic math confidence with structured escalation.")
    p.add_argument("--model", default="Qwen/Qwen2.5-Math-1.5B-Instruct")
    p.add_argument("--num-conf-heads", type=int, default=3)
    p.add_argument("--data-path", type=Path, default=DEFAULT_DATA)
    p.add_argument("--max-samples", type=int, default=500)
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--max-new-tokens", type=int, default=24)
    p.add_argument("--verification-max-new-tokens", type=int, default=48)
    p.add_argument("--answer-conf-threshold", type=float, default=0.20)
    p.add_argument("--escalate-threshold", type=float, default=0.35)
    p.add_argument("--confidence-head", type=Path, default=None)
    p.add_argument("--debug-limit", type=int, default=20)
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    rows = load_jsonl(args.data_path)[: args.max_samples]
    model = LuminaBasicModel(model_name=args.model, num_conf_heads=args.num_conf_heads)
    probe_bundle = load_probe(args.confidence_head) if args.confidence_head else None

    base_rows: List[Dict] = []
    structured_rows: List[Dict] = []
    debug_rows: List[Dict] = []

    for i, row in enumerate(rows):
        base = model.generate_candidate(
            prompt=math_prompt(row["question"]),
            max_new_tokens=args.max_new_tokens,
            seed=args.seed + i,
            branch_id="base",
        )
        if probe_bundle:
            base.confidence = probe_bundle.predict_prob(base.feature_vector)
        base_correct = int(is_correct(base.answer, row["answer"]))
        base_rows.append(
            {
                "question": row["question"],
                "gold": extract_math_final_answer(row["answer"]),
                "prediction": extract_math_final_answer(base.answer),
                "raw_prediction": base.answer,
                "confidence": base.confidence,
                "correct": base_correct,
            }
        )

        chosen = base
        chosen_correct = base_correct
        structured = None
        if base.confidence < args.escalate_threshold:
            structured = model.generate_candidate(
                prompt=structured_verification_prompt(row["question"], base.answer),
                max_new_tokens=args.verification_max_new_tokens,
                seed=args.seed + 10000 + i,
                branch_id="structured_verify",
            )
            if probe_bundle:
                structured.confidence = probe_bundle.predict_prob(structured.feature_vector)
            structured_correct = int(is_correct(structured.answer, row["answer"]))
            chosen = structured if structured.confidence >= base.confidence else base
            chosen_correct = structured_correct if chosen is structured else base_correct

        structured_rows.append(
            {
                "question": row["question"],
                "gold": extract_math_final_answer(row["answer"]),
                "prediction": extract_math_final_answer(chosen.answer),
                "raw_prediction": chosen.answer,
                "confidence": chosen.confidence,
                "correct": chosen_correct,
            }
        )

        if len(debug_rows) < args.debug_limit:
            debug_rows.append(
                {
                    "question": row["question"],
                    "gold": extract_math_final_answer(row["answer"]),
                    "base_prediction": extract_math_final_answer(base.answer),
                    "base_confidence": base.confidence,
                    "base_correct": base_correct,
                    "structured_prediction": extract_math_final_answer(structured.answer) if structured else "",
                    "structured_confidence": structured.confidence if structured else None,
                    "structured_correct": int(is_correct(structured.answer, row["answer"])) if structured else None,
                    "selected_path": chosen.branch_id,
                    "selected_prediction": extract_math_final_answer(chosen.answer),
                    "selected_confidence": chosen.confidence,
                    "selected_correct": chosen_correct,
                }
            )

    base_acc = sum(r["correct"] for r in base_rows) / len(base_rows) if base_rows else 0.0
    structured_acc = sum(r["correct"] for r in structured_rows) / len(structured_rows) if structured_rows else 0.0

    payload = {
        "model": args.model,
        "confidence_head": str(args.confidence_head) if args.confidence_head else None,
        "data_path": str(args.data_path),
        "samples": len(base_rows),
        "contract": {
            "domain": "math",
            "confidence_definition": "P(final answer is correct | prompt, model state, produced answer)",
            "correctness": "exact normalized final-answer match",
            "escalation_design": "structured verification pass conditioned on low-confidence draft answer",
        },
        "baseline": {
            "always_answer_accuracy": base_acc,
            "brier": brier_score(base_rows),
            "ece": ece(base_rows),
            "auroc": auroc(base_rows),
            "abstain_policy": evaluate_policy(base_rows, args.answer_conf_threshold).__dict__,
            "threshold_sweep": threshold_sweep(base_rows, [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50]),
            "risk_coverage": risk_coverage(base_rows, [0.25, 0.5, 0.75, 1.0]),
        },
        "structured_escalation": {
            "escalate_threshold": args.escalate_threshold,
            "always_answer_accuracy": structured_acc,
            "abstain_policy": evaluate_policy(structured_rows, args.answer_conf_threshold).__dict__,
            "threshold_sweep": threshold_sweep(structured_rows, [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50]),
            "risk_coverage": risk_coverage(structured_rows, [0.25, 0.5, 0.75, 1.0]),
        },
        "debug": debug_rows,
    }

    print(json.dumps(payload, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(payload, indent=2) + "\n")


if __name__ == "__main__":
    main()
