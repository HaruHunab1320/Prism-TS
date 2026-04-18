import argparse
import json
import random
from pathlib import Path


TEMPLATES = [
    {
        "pattern": "for_of_users_by_id",
        "array_name": "users",
        "output_name": "usersById",
        "element_var": "user",
        "key_expr": "user.id",
        "input_values": [
            [{"id": "u1", "name": "Ada"}, {"id": "u2", "name": "Linus"}],
            [{"id": "u3", "name": "Grace"}],
            [],
        ],
        "original": """const usersById = {};
for (const user of users) {
  usersById[user.id] = user;
}""",
        "target": "const usersById = users.reduce((acc, user) => { acc[user.id] = user; return acc; }, {});",
        "build": lambda values: {item["id"]: item for item in values},
    },
    {
        "pattern": "indexed_products_by_sku",
        "array_name": "products",
        "output_name": "productsBySku",
        "element_var": "product",
        "key_expr": "product.sku",
        "input_values": [
            [{"sku": "sku-1", "price": 5}, {"sku": "sku-2", "price": 9}],
            [{"sku": "sku-3", "price": 7}],
            [],
        ],
        "original": """const productsBySku = {};
for (let i = 0; i < products.length; i++) {
  productsBySku[products[i].sku] = products[i];
}""",
        "target": "const productsBySku = products.reduce((acc, product) => { acc[product.sku] = product; return acc; }, {});",
        "build": lambda values: {item["sku"]: item for item in values},
    },
    {
        "pattern": "for_of_pages_by_slug",
        "array_name": "pages",
        "output_name": "pagesBySlug",
        "element_var": "page",
        "key_expr": "page.slug",
        "input_values": [
            [{"slug": "home", "title": "Home"}, {"slug": "about", "title": "About"}],
            [{"slug": "docs", "title": "Docs"}],
            [],
        ],
        "original": """const pagesBySlug = {};
for (const page of pages) {
  pagesBySlug[page.slug] = page;
}""",
        "target": "const pagesBySlug = pages.reduce((acc, page) => { acc[page.slug] = page; return acc; }, {});",
        "build": lambda values: {item["slug"]: item for item in values},
    },
    {
        "pattern": "indexed_members_by_handle",
        "array_name": "members",
        "output_name": "membersByHandle",
        "element_var": "member",
        "key_expr": "member.handle",
        "input_values": [
            [{"handle": "vera", "role": "ops"}, {"handle": "echo", "role": "research"}],
            [{"handle": "rune", "role": "runtime"}],
            [],
        ],
        "original": """const membersByHandle = {};
for (let idx = 0; idx < members.length; idx += 1) {
  membersByHandle[members[idx].handle] = members[idx];
}""",
        "target": "const membersByHandle = members.reduce((acc, member) => { acc[member.handle] = member; return acc; }, {});",
        "build": lambda values: {item["handle"]: item for item in values},
    },
]

PROMPT_VARIANTS = [
    (
        "Refactor this JavaScript loop to use reduce.\n"
        "Return exactly one JavaScript statement assigning to `{output_name}`.\n"
        "Use `{array_name}.reduce(...)` and preserve the object index behavior.\n"
        "Do not add explanation.\n"
        "```js\n{code}\n```"
    ),
    (
        "Rewrite this object-index builder using reduce only.\n"
        "Keep the output binding as `{output_name}` and return one statement.\n"
        "```js\n{code}\n```"
    ),
    (
        "Convert this loop into one reduce-based object index assignment.\n"
        "Required shape: `const {output_name} = {array_name}.reduce(..., {{}});`\n"
        "Return only JavaScript.\n"
        "```js\n{code}\n```"
    ),
]


def eval_target(template: dict, values):
    return template["build"](values)


def make_row(idx: int, template: dict, rng: random.Random, *, prefix: str = "js_reduce_obj") -> dict:
    prompt = rng.choice(PROMPT_VARIANTS).format(
        code=template["original"],
        output_name=template["output_name"],
        array_name=template["array_name"],
    )
    return {
        "id": f"{prefix}_{idx:05d}",
        "source": "synthetic",
        "language": "javascript",
        "task_contract": "js_reduce_object_index_builder",
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
    p = argparse.ArgumentParser(description="Build synthetic dataset for js_reduce_object_index_builder.")
    p.add_argument("--output-dir", type=Path, default=Path("lumina_micro_specialists/data/datasets/js_reduce_object_index_builder_v1"))
    p.add_argument("--train-size", type=int, default=320)
    p.add_argument("--val-size", type=int, default=64)
    p.add_argument("--seed", type=int, default=7)
    args = p.parse_args()

    rng = random.Random(args.seed)
    templates = TEMPLATES[:]
    train_rows = [make_row(i, rng.choice(templates), rng) for i in range(args.train_size)]
    val_rows = [make_row(args.train_size + i, rng.choice(templates), rng) for i in range(args.val_size)]

    write_jsonl(train_rows, args.output_dir / "train.jsonl")
    write_jsonl(val_rows, args.output_dir / "val.jsonl")

    summary = {
        "task_contract": "js_reduce_object_index_builder",
        "train_size": len(train_rows),
        "val_size": len(val_rows),
        "patterns": sorted({row["input_pattern"] for row in train_rows + val_rows}),
        "output_dir": str(args.output_dir),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
