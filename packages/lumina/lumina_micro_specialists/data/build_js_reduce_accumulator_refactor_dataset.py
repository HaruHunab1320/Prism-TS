import argparse
import json
import random
from pathlib import Path


REDUCE_TEMPLATES = [
    {
        "pattern": "indexed_numeric_sum",
        "array_name": "nums",
        "output_name": "total",
        "initial_value": 0,
        "input_values": [
            [1, 2, 3],
            [0, -4, 7],
            [],
        ],
        "original": """let total = 0;
for (let i = 0; i < nums.length; i++) {
  total += nums[i];
}""",
        "target": "const total = nums.reduce((acc, n) => acc + n, 0);",
    },
    {
        "pattern": "for_of_numeric_product",
        "array_name": "nums",
        "output_name": "product",
        "initial_value": 1,
        "input_values": [
            [2, 3, 4],
            [5],
            [],
        ],
        "original": """let product = 1;
for (const num of nums) {
  product *= num;
}""",
        "target": "const product = nums.reduce((acc, num) => acc * num, 1);",
    },
    {
        "pattern": "indexed_string_concat",
        "array_name": "parts",
        "output_name": "joined",
        "initial_value": "",
        "input_values": [
            ["a", "b", "c"],
            ["hello"],
            [],
        ],
        "original": """let joined = "";
for (let i = 0; i < parts.length; i++) {
  joined += parts[i];
}""",
        "target": "const joined = parts.reduce((acc, part) => acc + part, \"\");",
    },
    {
        "pattern": "for_of_property_sum",
        "array_name": "users",
        "output_name": "totalAge",
        "initial_value": 0,
        "input_values": [
            [{"age": 10}, {"age": 20}],
            [{"age": 5}],
            [],
        ],
        "original": """let totalAge = 0;
for (const user of users) {
  totalAge += user.age;
}""",
        "target": "const totalAge = users.reduce((acc, user) => acc + user.age, 0);",
    },
]


HARD_REDUCE_TEMPLATES = [
    {
        "pattern": "indexed_numeric_sum_assignment_style",
        "array_name": "measurements",
        "output_name": "runningTotal",
        "initial_value": 0,
        "input_values": [
            [4, 5, 6],
            [-3, 9],
            [],
        ],
        "original": """let runningTotal = 0;
for (let idx = 0; idx < measurements.length; idx += 1) {
  runningTotal = runningTotal + measurements[idx];
}""",
        "target": "const runningTotal = measurements.reduce((acc, measurement) => acc + measurement, 0);",
    },
    {
        "pattern": "for_of_property_sum_assignment_style",
        "array_name": "roster",
        "output_name": "scoreTotal",
        "initial_value": 0,
        "input_values": [
            [{"score": 11}, {"score": 7}],
            [{"score": 5}],
            [],
        ],
        "original": """let scoreTotal = 0;
for (const player of roster) {
  scoreTotal = scoreTotal + player.score;
}""",
        "target": "const scoreTotal = roster.reduce((acc, player) => acc + player.score, 0);",
    },
    {
        "pattern": "indexed_string_concat_named_parts",
        "array_name": "nameParts",
        "output_name": "fullName",
        "initial_value": "",
        "input_values": [
            ["Ada", "Lovelace"],
            ["Grace"],
            [],
        ],
        "original": """let fullName = "";
for (let i = 0; i < nameParts.length; i++) {
  fullName = fullName + nameParts[i];
}""",
        "target": "const fullName = nameParts.reduce((acc, part) => acc + part, \"\");",
    },
    {
        "pattern": "for_of_numeric_product_assignment_style",
        "array_name": "weights",
        "output_name": "combinedWeight",
        "initial_value": 1,
        "input_values": [
            [2, 5, 3],
            [7],
            [],
        ],
        "original": """let combinedWeight = 1;
for (const factor of weights) {
  combinedWeight = combinedWeight * factor;
}""",
        "target": "const combinedWeight = weights.reduce((acc, factor) => acc * factor, 1);",
    },
    {
        "pattern": "indexed_property_sum_long_names",
        "array_name": "lineItems",
        "output_name": "totalCents",
        "initial_value": 0,
        "input_values": [
            [{"cents": 120}, {"cents": 30}],
            [{"cents": 99}],
            [],
        ],
        "original": """let totalCents = 0;
for (let itemIndex = 0; itemIndex < lineItems.length; itemIndex++) {
  totalCents += lineItems[itemIndex].cents;
}""",
        "target": "const totalCents = lineItems.reduce((acc, item) => acc + item.cents, 0);",
    },
    {
        "pattern": "for_of_string_concat_assignment_style",
        "array_name": "segments",
        "output_name": "pathText",
        "initial_value": "",
        "input_values": [
            ["usr", "/", "bin"],
            ["tmp"],
            [],
        ],
        "original": """let pathText = "";
for (const segment of segments) {
  pathText = pathText + segment;
}""",
        "target": "const pathText = segments.reduce((acc, segment) => acc + segment, \"\");",
    },
]


HARD_REDUCE_TEMPLATES_V2 = [
    {
        "pattern": "for_of_weighted_sum",
        "array_name": "lineItems",
        "output_name": "totalCost",
        "initial_value": 0,
        "input_values": [
            [{"price": 4, "qty": 3}, {"price": 2, "qty": 5}],
            [{"price": 9, "qty": 1}],
            [],
        ],
        "original": """let totalCost = 0;
for (const item of lineItems) {
  totalCost = totalCost + item.price * item.qty;
}""",
        "target": "const totalCost = lineItems.reduce((acc, item) => acc + item.price * item.qty, 0);",
    },
    {
        "pattern": "indexed_max_value",
        "array_name": "scores",
        "output_name": "maxScore",
        "initial_value": -999999999,
        "input_values": [
            [3, 11, 7],
            [-5, -2],
            [],
        ],
        "original": """let maxScore = -999999999;
for (let i = 0; i < scores.length; i++) {
  maxScore = Math.max(maxScore, scores[i]);
}""",
        "target": "const maxScore = scores.reduce((acc, score) => Math.max(acc, score), -999999999);",
    },
    {
        "pattern": "for_of_min_value",
        "array_name": "temps",
        "output_name": "minTemp",
        "initial_value": 999999999,
        "input_values": [
            [8, 3, 5],
            [14],
            [],
        ],
        "original": """let minTemp = 999999999;
for (const temp of temps) {
  minTemp = Math.min(minTemp, temp);
}""",
        "target": "const minTemp = temps.reduce((acc, temp) => Math.min(acc, temp), 999999999);",
    },
    {
        "pattern": "for_of_boolean_and",
        "array_name": "checks",
        "output_name": "allPassed",
        "initial_value": True,
        "input_values": [
            [{"ok": True}, {"ok": True}],
            [{"ok": True}, {"ok": False}],
            [],
        ],
        "original": """let allPassed = true;
for (const check of checks) {
  allPassed = allPassed && check.ok;
}""",
        "target": "const allPassed = checks.reduce((acc, check) => acc && check.ok, true);",
    },
    {
        "pattern": "for_of_boolean_or",
        "array_name": "flags",
        "output_name": "hasFailure",
        "initial_value": False,
        "input_values": [
            [{"failed": False}, {"failed": False}],
            [{"failed": False}, {"failed": True}],
            [],
        ],
        "original": """let hasFailure = false;
for (const flag of flags) {
  hasFailure = hasFailure || flag.failed;
}""",
        "target": "const hasFailure = flags.reduce((acc, flag) => acc || flag.failed, false);",
    },
    {
        "pattern": "for_of_count_predicate",
        "array_name": "users",
        "output_name": "adultCount",
        "initial_value": 0,
        "input_values": [
            [{"age": 17}, {"age": 24}, {"age": 30}],
            [{"age": 12}],
            [],
        ],
        "original": """let adultCount = 0;
for (const user of users) {
  adultCount = adultCount + (user.age >= 18 ? 1 : 0);
}""",
        "target": "const adultCount = users.reduce((acc, user) => acc + (user.age >= 18 ? 1 : 0), 0);",
    },
    {
        "pattern": "indexed_sum_string_lengths",
        "array_name": "words",
        "output_name": "totalChars",
        "initial_value": 0,
        "input_values": [
            ["ab", "cdef"],
            ["x"],
            [],
        ],
        "original": """let totalChars = 0;
for (let idx = 0; idx < words.length; idx += 1) {
  totalChars += words[idx].length;
}""",
        "target": "const totalChars = words.reduce((acc, word) => acc + word.length, 0);",
    },
    {
        "pattern": "for_of_collect_initials",
        "array_name": "users",
        "output_name": "initials",
        "initial_value": "",
        "input_values": [
            [{"name": "Ada"}, {"name": "Linus"}],
            [{"name": "Grace"}],
            [],
        ],
        "original": """let initials = "";
for (const user of users) {
  initials = initials + user.name[0];
}""",
        "target": "const initials = users.reduce((acc, user) => acc + user.name[0], \"\");",
    },
]


PROMPT_VARIANTS = [
    (
        "Refactor this loop to use reduce.\n"
        "Return exactly one JavaScript statement assigning the result to `{output_name}`.\n"
        "Use `{array_name}.reduce(...)` and do not add explanation.\n"
        "```js\n{code}\n```"
    ),
    (
        "Rewrite this JavaScript accumulator loop using reduce only.\n"
        "Keep the accumulator binding as `{output_name}` and return a single statement.\n"
        "```js\n{code}\n```"
    ),
    (
        "Convert this aggregation loop into reduce and return only JavaScript.\n"
        "Your answer must be one statement of the form `const {output_name} = {array_name}.reduce(...);`.\n"
        "```js\n{code}\n```"
    ),
]


HARD_PROMPT_VARIANTS = [
    (
        "Refactor this accumulator loop to reduce.\n"
        "Keep the final binding name exactly `{output_name}`.\n"
        "Return one JavaScript statement only.\n"
        "```js\n{code}\n```"
    ),
    (
        "Rewrite this aggregation loop in idiomatic JavaScript.\n"
        "Use `{array_name}.reduce(...)` and assign the result to `{output_name}`.\n"
        "Do not include comments, prose, or repeated statements.\n"
        "```js\n{code}\n```"
    ),
    (
        "Convert this loop into a single reduce-based assignment.\n"
        "Required shape: `const {output_name} = {array_name}.reduce(...);`\n"
        "Return only the final statement.\n"
        "```js\n{code}\n```"
    ),
]


HARD_PROMPT_VARIANTS_V2 = [
    (
        "Rewrite this reducer candidate as a single JavaScript statement.\n"
        "Keep the final variable name exactly `{output_name}`.\n"
        "Use `{array_name}.reduce(...)`.\n"
        "```js\n{code}\n```"
    ),
    (
        "Convert this accumulation loop into one reduce assignment.\n"
        "Do not explain anything. Do not repeat the statement.\n"
        "Expected binding: `{output_name}`.\n"
        "```js\n{code}\n```"
    ),
    (
        "Refactor this loop to reduce while preserving behavior.\n"
        "Return only the final JavaScript statement assigning to `{output_name}`.\n"
        "```js\n{code}\n```"
    ),
]


def eval_target(template: dict, values):
    pattern = template["pattern"]
    if pattern == "indexed_numeric_sum":
        return sum(values)
    if pattern == "for_of_numeric_product":
        out = 1
        for value in values:
            out *= value
        return out
    if pattern == "indexed_string_concat":
        return "".join(values)
    if pattern == "for_of_property_sum":
        return sum(v["age"] for v in values)
    if pattern == "indexed_numeric_sum_assignment_style":
        return sum(values)
    if pattern == "for_of_property_sum_assignment_style":
        return sum(v["score"] for v in values)
    if pattern == "indexed_string_concat_named_parts":
        return "".join(values)
    if pattern == "for_of_numeric_product_assignment_style":
        out = 1
        for value in values:
            out *= value
        return out
    if pattern == "indexed_property_sum_long_names":
        return sum(v["cents"] for v in values)
    if pattern == "for_of_string_concat_assignment_style":
        return "".join(values)
    if pattern == "for_of_weighted_sum":
        return sum(v["price"] * v["qty"] for v in values)
    if pattern == "indexed_max_value":
        out = -999999999
        for value in values:
            out = max(out, value)
        return out
    if pattern == "for_of_min_value":
        out = 999999999
        for value in values:
            out = min(out, value)
        return out
    if pattern == "for_of_boolean_and":
        out = True
        for value in values:
            out = out and value["ok"]
        return out
    if pattern == "for_of_boolean_or":
        out = False
        for value in values:
            out = out or value["failed"]
        return out
    if pattern == "for_of_count_predicate":
        return sum(1 for value in values if value["age"] >= 18)
    if pattern == "indexed_sum_string_lengths":
        return sum(len(value) for value in values)
    if pattern == "for_of_collect_initials":
        return "".join(value["name"][0] for value in values)
    raise ValueError(f"unknown pattern: {pattern}")


def make_row(idx: int, template: dict, rng: random.Random, *, prompt_variants=None, prefix: str = "js_reduce") -> dict:
    prompt = rng.choice(prompt_variants or PROMPT_VARIANTS).format(
        code=template["original"],
        output_name=template["output_name"],
        array_name=template["array_name"],
    )
    return {
        "id": f"{prefix}_{idx:05d}",
        "source": "synthetic",
        "language": "javascript",
        "task_contract": "js_reduce_accumulator_refactor",
        "question": prompt,
        "answer": template["target"],
        "prompt": prompt,
        "input_code": template["original"],
        "target_code": template["target"],
        "input_pattern": template["pattern"],
        "expected_output_var": template["output_name"],
        "expected_array_var": template["array_name"],
        "expected_initial_value": template["initial_value"],
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
    p = argparse.ArgumentParser(description="Build synthetic dataset for js_reduce_accumulator_refactor.")
    p.add_argument("--output-dir", type=Path, default=Path("lumina_micro_specialists/data/datasets/js_reduce_accumulator_refactor_v1"))
    p.add_argument("--train-size", type=int, default=320)
    p.add_argument("--val-size", type=int, default=64)
    p.add_argument("--hard-val-size", type=int, default=128)
    p.add_argument("--hard-val-v2-size", type=int, default=128)
    p.add_argument("--seed", type=int, default=7)
    args = p.parse_args()

    rng = random.Random(args.seed)
    templates = REDUCE_TEMPLATES[:]
    train_rows = [make_row(i, rng.choice(templates), rng) for i in range(args.train_size)]
    val_rows = [make_row(args.train_size + i, rng.choice(templates), rng) for i in range(args.val_size)]
    hard_templates = HARD_REDUCE_TEMPLATES[:]
    hard_val_rows = [
        make_row(
            args.train_size + args.val_size + i,
            rng.choice(hard_templates),
            rng,
            prompt_variants=HARD_PROMPT_VARIANTS,
            prefix="js_reduce_hard",
        )
        for i in range(args.hard_val_size)
    ]
    hard_templates_v2 = HARD_REDUCE_TEMPLATES_V2[:]
    hard_val_v2_rows = [
        make_row(
            args.train_size + args.val_size + args.hard_val_size + i,
            rng.choice(hard_templates_v2),
            rng,
            prompt_variants=HARD_PROMPT_VARIANTS_V2,
            prefix="js_reduce_hard_v2",
        )
        for i in range(args.hard_val_v2_size)
    ]

    write_jsonl(train_rows, args.output_dir / "train.jsonl")
    write_jsonl(val_rows, args.output_dir / "val.jsonl")
    write_jsonl(hard_val_rows, args.output_dir / "hard_val.jsonl")
    write_jsonl(hard_val_v2_rows, args.output_dir / "hard_val_v2.jsonl")

    summary = {
        "task_contract": "js_reduce_accumulator_refactor",
        "train_size": len(train_rows),
        "val_size": len(val_rows),
        "hard_val_size": len(hard_val_rows),
        "hard_val_v2_size": len(hard_val_v2_rows),
        "patterns": sorted({row["input_pattern"] for row in train_rows + val_rows}),
        "hard_patterns": sorted({row["input_pattern"] for row in hard_val_rows}),
        "hard_patterns_v2": sorted({row["input_pattern"] for row in hard_val_v2_rows}),
        "output_dir": str(args.output_dir),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
