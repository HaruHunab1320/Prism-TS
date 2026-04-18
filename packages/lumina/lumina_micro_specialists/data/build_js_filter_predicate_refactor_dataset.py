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

HARD_FILTER_TEMPLATES = [
    {
        "pattern": "for_of_object_property_and",
        "array_name": "users",
        "output_name": "eligibleUsers",
        "element_var": "user",
        "input_values": [
            [{"age": 21, "active": True}, {"age": 17, "active": True}, {"age": 24, "active": False}],
            [{"age": 30, "active": True}],
            [],
        ],
        "original": """const eligibleUsers = [];
for (const user of users) {
  if (user.age >= 18 && user.active) {
    eligibleUsers.push(user);
  }
}""",
        "target": "const eligibleUsers = users.filter(user => user.age >= 18 && user.active);",
        "predicate": lambda item: item["age"] >= 18 and item["active"],
    },
    {
        "pattern": "indexed_numeric_range",
        "array_name": "scores",
        "output_name": "middleScores",
        "element_var": "score",
        "input_values": [
            [55, 71, 88, 94],
            [69, 91],
            [],
        ],
        "original": """const middleScores = [];
for (let i = 0; i < scores.length; i++) {
  if (scores[i] >= 70 && scores[i] < 90) {
    middleScores.push(scores[i]);
  }
}""",
        "target": "const middleScores = scores.filter(score => score >= 70 && score < 90);",
        "predicate": lambda item: item >= 70 and item < 90,
    },
    {
        "pattern": "for_of_object_property_or",
        "array_name": "tickets",
        "output_name": "openOrUrgent",
        "element_var": "ticket",
        "input_values": [
            [{"status": "open", "urgent": False}, {"status": "closed", "urgent": True}, {"status": "closed", "urgent": False}],
            [{"status": "open", "urgent": True}],
            [],
        ],
        "original": """const openOrUrgent = [];
for (const ticket of tickets) {
  if (ticket.status === "open" || ticket.urgent) {
    openOrUrgent.push(ticket);
  }
}""",
        "target": 'const openOrUrgent = tickets.filter(ticket => ticket.status === "open" || ticket.urgent);',
        "predicate": lambda item: item["status"] == "open" or item["urgent"],
    },
    {
        "pattern": "for_of_string_negated_includes",
        "array_name": "files",
        "output_name": "sourceFiles",
        "element_var": "file",
        "input_values": [
            ["index.ts", "README.md", "util.ts"],
            ["notes.txt"],
            [],
        ],
        "original": """const sourceFiles = [];
for (const file of files) {
  if (!file.endsWith(".md")) {
    sourceFiles.push(file);
  }
}""",
        "target": 'const sourceFiles = files.filter(file => !file.endsWith(".md"));',
        "predicate": lambda item: not item.endswith(".md"),
    },
    {
        "pattern": "indexed_object_property_neq",
        "array_name": "orders",
        "output_name": "nonDraftOrders",
        "element_var": "order",
        "input_values": [
            [{"status": "draft"}, {"status": "paid"}, {"status": "shipped"}],
            [{"status": "draft"}],
            [],
        ],
        "original": """const nonDraftOrders = [];
for (let idx = 0; idx < orders.length; idx += 1) {
  if (orders[idx].status !== "draft") {
    nonDraftOrders.push(orders[idx]);
  }
}""",
        "target": 'const nonDraftOrders = orders.filter(order => order.status !== "draft");',
        "predicate": lambda item: item["status"] != "draft",
    },
    {
        "pattern": "for_of_string_length_and_includes",
        "array_name": "tags",
        "output_name": "featureTags",
        "element_var": "tag",
        "input_values": [
            ["feat-ui", "fix", "feat-api"],
            ["chore"],
            [],
        ],
        "original": """const featureTags = [];
for (const tag of tags) {
  if (tag.startsWith("feat-") && tag.length > 5) {
    featureTags.push(tag);
  }
}""",
        "target": 'const featureTags = tags.filter(tag => tag.startsWith("feat-") && tag.length > 5);',
        "predicate": lambda item: item.startswith("feat-") and len(item) > 5,
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

HARD_PROMPT_VARIANTS = [
    (
        "Refactor this conditional-push loop into one filter assignment.\n"
        "Keep the output binding exactly `{output_name}`.\n"
        "Return only JavaScript.\n"
        "```js\n{code}\n```"
    ),
    (
        "Rewrite this selection loop in idiomatic JavaScript.\n"
        "Use `{array_name}.filter(...)` and assign to `{output_name}`.\n"
        "Do not add comments or prose.\n"
        "```js\n{code}\n```"
    ),
    (
        "Convert this loop into a single filter-based assignment.\n"
        "Required shape: `const {output_name} = {array_name}.filter(...);`\n"
        "Return only the final statement.\n"
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
    p.add_argument("--hard-val-size", type=int, default=128)
    p.add_argument("--seed", type=int, default=7)
    args = p.parse_args()

    rng = random.Random(args.seed)
    templates = FILTER_TEMPLATES[:]
    train_rows = [make_row(i, rng.choice(templates), rng) for i in range(args.train_size)]
    val_rows = [make_row(args.train_size + i, rng.choice(templates), rng) for i in range(args.val_size)]
    hard_templates = HARD_FILTER_TEMPLATES[:]
    hard_val_rows = [
        make_row(
            args.train_size + args.val_size + i,
            rng.choice(hard_templates),
            rng,
            prefix="js_filter_hard",
        )
        for i in range(args.hard_val_size)
    ]
    for row in hard_val_rows:
        row["prompt"] = rng.choice(HARD_PROMPT_VARIANTS).format(
            code=row["input_code"],
            output_name=row["expected_output_var"],
            array_name=row["expected_array_var"],
        )
        row["question"] = row["prompt"]

    write_jsonl(train_rows, args.output_dir / "train.jsonl")
    write_jsonl(val_rows, args.output_dir / "val.jsonl")
    write_jsonl(hard_val_rows, args.output_dir / "hard_val.jsonl")

    summary = {
        "task_contract": "js_filter_predicate_refactor",
        "train_size": len(train_rows),
        "val_size": len(val_rows),
        "hard_val_size": len(hard_val_rows),
        "patterns": sorted({row["input_pattern"] for row in train_rows + val_rows}),
        "hard_patterns": sorted({row["input_pattern"] for row in hard_val_rows}),
        "output_dir": str(args.output_dir),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
