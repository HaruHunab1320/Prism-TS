import argparse
import json
import random
from pathlib import Path


FILTER_TEMPLATES = [
    {
        "pattern": "for_of_object_property_gte",
        "array_name": "users",
        "output_name": "adults",
        "element_var": "user",
        "input_values": [
            [{"age": 17}, {"age": 24}, {"age": 31}],
            [{"age": 12}],
            [],
        ],
        "original": """const adults = [];
for (const user of users) {
  if (user.age >= 18) {
    adults.push(user);
  }
}""",
        "target": "const adults = users.filter(user => user.age >= 18);",
        "predicate": lambda item: item["age"] >= 18,
    },
    {
        "pattern": "indexed_numeric_even",
        "array_name": "nums",
        "output_name": "evens",
        "element_var": "num",
        "input_values": [
            [1, 2, 3, 4],
            [5, 7],
            [],
        ],
        "original": """const evens = [];
for (let i = 0; i < nums.length; i++) {
  if (nums[i] % 2 === 0) {
    evens.push(nums[i]);
  }
}""",
        "target": "const evens = nums.filter(num => num % 2 === 0);",
        "predicate": lambda item: item % 2 == 0,
    },
    {
        "pattern": "for_of_string_length_gt",
        "array_name": "words",
        "output_name": "longWords",
        "element_var": "word",
        "input_values": [
            ["a", "tool", "alpha"],
            ["go", "to"],
            [],
        ],
        "original": """const longWords = [];
for (const word of words) {
  if (word.length > 3) {
    longWords.push(word);
  }
}""",
        "target": "const longWords = words.filter(word => word.length > 3);",
        "predicate": lambda item: len(item) > 3,
    },
    {
        "pattern": "for_of_object_property_eq",
        "array_name": "orders",
        "output_name": "paidOrders",
        "element_var": "order",
        "input_values": [
            [{"status": "paid"}, {"status": "draft"}, {"status": "paid"}],
            [{"status": "draft"}],
            [],
        ],
        "original": """const paidOrders = [];
for (const order of orders) {
  if (order.status === \"paid\") {
    paidOrders.push(order);
  }
}""",
        "target": "const paidOrders = orders.filter(order => order.status === \"paid\");",
        "predicate": lambda item: item["status"] == "paid",
    },
]

PROMPT_VARIANTS = [
    (
        "Refactor this loop to use filter.\n"
        "Return exactly one JavaScript statement assigning the result to `{output_name}`.\n"
        "Use `{array_name}.filter(...)` and do not add explanation.\n"
        "```js\n{code}\n```"
    ),
    (
        "Rewrite this JavaScript selection loop using filter only.\n"
        "Keep the output binding as `{output_name}` and return a single statement.\n"
        "```js\n{code}\n```"
    ),
    (
        "Convert this loop into one filter-based assignment.\n"
        "Required shape: `const {output_name} = {array_name}.filter(...);`\n"
        "Return only JavaScript.\n"
        "```js\n{code}\n```"
    ),
]


def eval_target(template: dict, values):
    return [value for value in values if template["predicate"](value)]


def make_row(idx: int, template: dict, rng: random.Random, *, prefix: str = "js_filter") -> dict:
    prompt = rng.choice(PROMPT_VARIANTS).format(
        code=template["original"],
        output_name=template["output_name"],
        array_name=template["array_name"],
    )
    return {
        "id": f"{prefix}_{idx:05d}",
        "source": "synthetic",
        "language": "javascript",
        "task_contract": "js_filter_predicate_refactor",
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


def write_jsonl(rows, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def main():
    p = argparse.ArgumentParser(description="Build synthetic dataset for js_filter_predicate_refactor.")
    p.add_argument("--output-dir", type=Path, default=Path("lumina_micro_specialists/data/datasets/js_filter_predicate_refactor_v1"))
    p.add_argument("--train-size", type=int, default=320)
    p.add_argument("--val-size", type=int, default=64)
    p.add_argument("--seed", type=int, default=7)
    args = p.parse_args()

    rng = random.Random(args.seed)
    templates = FILTER_TEMPLATES[:]
    train_rows = [make_row(i, rng.choice(templates), rng) for i in range(args.train_size)]
    val_rows = [make_row(args.train_size + i, rng.choice(templates), rng) for i in range(args.val_size)]

    write_jsonl(train_rows, args.output_dir / "train.jsonl")
    write_jsonl(val_rows, args.output_dir / "val.jsonl")

    summary = {
        "task_contract": "js_filter_predicate_refactor",
        "train_size": len(train_rows),
        "val_size": len(val_rows),
        "patterns": sorted({row["input_pattern"] for row in train_rows + val_rows}),
        "output_dir": str(args.output_dir),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
