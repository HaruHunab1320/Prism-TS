import argparse
import json
import random
from pathlib import Path


LOOP_TEMPLATES = [
    {
        "pattern": "indexed_property_upper",
        "array_name": "users",
        "output_name": "out",
        "item_name": "user",
        "input_values": [
            [{"name": "ada"}, {"name": "linus"}],
            [{"name": "grace"}],
            [],
        ],
        "original": """const out = [];
for (let i = 0; i < users.length; i++) {
  out.push(users[i].name.toUpperCase());
}""",
        "target": "const out = users.map((user) => user.name.toUpperCase());",
    },
    {
        "pattern": "indexed_numeric_double",
        "array_name": "nums",
        "output_name": "doubled",
        "item_name": "n",
        "input_values": [
            [1, 2, 3],
            [0, -4, 7],
            [],
        ],
        "original": """const doubled = [];
for (let i = 0; i < nums.length; i++) {
  doubled.push(nums[i] * 2);
}""",
        "target": "const doubled = nums.map((n) => n * 2);",
    },
    {
        "pattern": "for_of_object_literal",
        "array_name": "users",
        "output_name": "summary",
        "item_name": "user",
        "input_values": [
            [{"id": 1, "name": "ada"}, {"id": 2, "name": "linus"}],
            [{"id": 9, "name": "grace"}],
            [],
        ],
        "original": """const summary = [];
for (const user of users) {
  summary.push({ id: user.id, label: user.name.toUpperCase() });
}""",
        "target": "const summary = users.map((user) => ({ id: user.id, label: user.name.toUpperCase() }));",
    },
    {
        "pattern": "indexed_trim",
        "array_name": "words",
        "output_name": "cleaned",
        "item_name": "word",
        "input_values": [
            [" a ", "b ", " c"],
            [""],
            [],
        ],
        "original": """const cleaned = [];
for (let i = 0; i < words.length; i++) {
  cleaned.push(words[i].trim());
}""",
        "target": "const cleaned = words.map((word) => word.trim());",
    },
]


PROMPT_VARIANTS = [
    "Refactor this loop to use map:\n```js\n{code}\n```",
    "Rewrite this JavaScript array transform using map only:\n```js\n{code}\n```",
    "Convert this push loop into map and return only JavaScript:\n```js\n{code}\n```",
]


def make_row(idx: int, template: dict, rng: random.Random) -> dict:
    prompt = rng.choice(PROMPT_VARIANTS).format(code=template["original"])
    return {
        "id": f"js_map_{idx:05d}",
        "source": "synthetic",
        "language": "javascript",
        "task_contract": "js_array_loop_to_map",
        "question": prompt,
        "answer": template["target"],
        "prompt": prompt,
        "input_code": template["original"],
        "target_code": template["target"],
        "input_pattern": template["pattern"],
        "expected_output_var": template["output_name"],
        "expected_array_var": template["array_name"],
        "tests": [
            {"input": val, "expected_output": eval_target(template, val)}
            for val in template["input_values"]
        ],
    }


def eval_target(template: dict, values):
    pattern = template["pattern"]
    if pattern == "indexed_property_upper":
        return [x["name"].upper() for x in values]
    if pattern == "indexed_numeric_double":
        return [x * 2 for x in values]
    if pattern == "for_of_object_literal":
        return [{"id": x["id"], "label": x["name"].upper()} for x in values]
    if pattern == "indexed_trim":
        return [x.strip() for x in values]
    raise ValueError(f"unknown pattern: {pattern}")


def write_jsonl(rows, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def main():
    p = argparse.ArgumentParser(description="Build synthetic dataset for js_array_loop_to_map.")
    p.add_argument("--output-dir", type=Path, default=Path("lumina_micro_specialists/data/datasets/js_array_loop_to_map_v1"))
    p.add_argument("--train-size", type=int, default=320)
    p.add_argument("--val-size", type=int, default=64)
    p.add_argument("--seed", type=int, default=7)
    args = p.parse_args()

    rng = random.Random(args.seed)
    templates = LOOP_TEMPLATES[:]
    train_rows = [make_row(i, rng.choice(templates), rng) for i in range(args.train_size)]
    val_rows = [make_row(args.train_size + i, rng.choice(templates), rng) for i in range(args.val_size)]

    write_jsonl(train_rows, args.output_dir / "train.jsonl")
    write_jsonl(val_rows, args.output_dir / "val.jsonl")

    summary = {
        "task_contract": "js_array_loop_to_map",
        "train_size": len(train_rows),
        "val_size": len(val_rows),
        "patterns": sorted({row["input_pattern"] for row in train_rows + val_rows}),
        "output_dir": str(args.output_dir),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
