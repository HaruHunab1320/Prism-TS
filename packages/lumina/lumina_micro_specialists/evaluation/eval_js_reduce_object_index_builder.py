import argparse
import json
import re
from pathlib import Path

from lumina_micro_specialists.evaluation.verify_js_reduce_object_index_builder import verify_js_reduce_object_index_builder
from lumina_micro_specialists.runtime.router_js_reduce_object_index_builder import route_js_reduce_object_index_builder


def load_jsonl(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_transformers_model(model_name: str):
    from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

    tok = AutoTokenizer.from_pretrained(model_name)
    mdl = AutoModelForCausalLM.from_pretrained(model_name)
    return pipeline("text-generation", model=mdl, tokenizer=tok)


def strict_prompt(row: dict) -> str:
    output_name = row["expected_output_var"]
    array_name = row["expected_array_var"]
    return (
        "You are a JavaScript refactoring specialist.\n"
        "Return only valid JavaScript.\n"
        "Preserve behavior.\n"
        "Use Array.prototype.reduce.\n"
        f"Return exactly one statement assigning to `{output_name}`.\n"
        f"Use `{array_name}.reduce(...)` to build an object index.\n"
        "Do not add explanation.\n\n"
        f"{row['prompt']}\n"
    )


def extract_code(text: str, row: dict) -> str:
    stripped = text.strip()
    output_name = re.escape(row["expected_output_var"])
    pattern = re.compile(rf"\b(?:const|let|var)\s+{output_name}\s*=\s*.*?;", flags=re.DOTALL)
    match = pattern.search(stripped)
    if match and ".reduce(" in match.group(0):
        return " ".join(match.group(0).split())
    for line in stripped.splitlines():
        line = line.strip()
        if row["expected_output_var"] in line and ".reduce(" in line and "=" in line:
            return line
    return stripped


def generate_candidate(generator, row, max_new_tokens: int):
    out = generator(strict_prompt(row), max_new_tokens=max_new_tokens, do_sample=False, return_full_text=False)[0]["generated_text"]
    return extract_code(out, row)


def main():
    p = argparse.ArgumentParser(description="Evaluate base-model baseline for js_reduce_object_index_builder.")
    p.add_argument("--dataset", type=Path, default=Path("lumina_micro_specialists/data/datasets/js_reduce_object_index_builder_v1/val.jsonl"))
    p.add_argument("--model", default=None)
    p.add_argument("--candidate-source", choices=["target", "input", "model"], default="target")
    p.add_argument("--max-samples", type=int, default=64)
    p.add_argument("--max-new-tokens", type=int, default=128)
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    rows = load_jsonl(args.dataset)[: args.max_samples]
    generator = None
    if args.candidate_source == "model":
        if not args.model:
            raise SystemExit("--model is required when --candidate-source=model")
        generator = load_transformers_model(args.model)

    results = []
    routed = 0
    for row in rows:
        decision = route_js_reduce_object_index_builder(row["prompt"], row["input_code"])
        if decision.route != "js_reduce_object_index_builder":
            results.append({"id": row["id"], "routed": False, "correct": False, "syntax_valid": False, "uses_reduce": False, "reason": decision.reason})
            continue
        routed += 1
        if args.candidate_source == "target":
            candidate = row["target_code"]
        elif args.candidate_source == "input":
            candidate = row["input_code"]
        else:
            candidate = generate_candidate(generator, row, args.max_new_tokens)
        verdict = verify_js_reduce_object_index_builder(candidate, row)
        results.append({
            "id": row["id"],
            "routed": True,
            "correct": verdict.passed,
            "syntax_valid": verdict.syntax_valid,
            "uses_reduce": verdict.uses_reduce,
            "candidate": candidate,
            "details": verdict.details,
        })

    total = len(results)
    payload = {
        "task_contract": "js_reduce_object_index_builder",
        "candidate_source": args.candidate_source,
        "model": args.model,
        "samples": total,
        "routed_rate": routed / total if total else 0.0,
        "pass_rate": sum(int(r.get("correct", False)) for r in results) / total if total else 0.0,
        "syntax_valid_rate": sum(int(r.get("syntax_valid", False)) for r in results) / total if total else 0.0,
        "uses_reduce_rate": sum(int(r.get("uses_reduce", False)) for r in results) / total if total else 0.0,
        "rows": results,
    }
    text = json.dumps(payload, indent=2)
    print(text)
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
