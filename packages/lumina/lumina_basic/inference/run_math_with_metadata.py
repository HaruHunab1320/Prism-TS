from __future__ import annotations

import argparse
import json
from pathlib import Path

from lumina_basic.inference.math_runtime import answer_math_question


def main() -> None:
    p = argparse.ArgumentParser(description="Run the promoted Lumina Basic math path and emit Prism-facing metadata.")
    p.add_argument("--question", required=True)
    p.add_argument("--model", default=None)
    p.add_argument("--confidence-head", default=None)
    p.add_argument("--num-conf-heads", type=int, default=3)
    p.add_argument("--max-new-tokens", type=int, default=24)
    p.add_argument("--answer-conf-threshold", type=float, default=0.20)
    p.add_argument("--escalate-threshold", type=float, default=0.35)
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--no-math-contract-features", action="store_true")
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    result = answer_math_question(
        args.question,
        model_name=args.model,
        confidence_head=args.confidence_head,
        num_conf_heads=args.num_conf_heads,
        max_new_tokens=args.max_new_tokens,
        answer_conf_threshold=args.answer_conf_threshold,
        escalate_threshold=args.escalate_threshold,
        seed=args.seed,
        use_math_contract_features=not args.no_math_contract_features,
    )
    payload = result.to_dict()
    print(json.dumps(payload, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(payload, indent=2) + "\n")


if __name__ == "__main__":
    main()
