from __future__ import annotations

import json

from lumina_basic.evaluation.eval_math_confidence import (
    canonicalize_number,
    extract_math_final_answer,
    is_correct,
)


def main() -> None:
    checks = {
        "empty_string": extract_math_final_answer("") == "",
        "whitespace_only": extract_math_final_answer("   \n\n  ") == "",
        "code_fence_only": extract_math_final_answer("```\n```") == "",
        "final_answer_blank": extract_math_final_answer("Final answer:   ") == "",
        "numeric_extract": extract_math_final_answer("Answer: 42") == "42",
        "fraction_normalize": canonicalize_number("6/3") == "2",
        "empty_vs_gold_false": is_correct("", "5") is False,
        "exact_numeric_true": is_correct("Final answer: 12", "12") is True,
    }
    failed = [name for name, ok in checks.items() if not ok]
    payload = {"ok": not failed, "checks": checks, "failed": failed}
    print(json.dumps(payload, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
