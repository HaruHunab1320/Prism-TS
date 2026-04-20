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
        "target": "const usersById = users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {});",
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
        "target": "const productsBySku = products.reduce((acc, product) => ({ ...acc, [product.sku]: product }), {});",
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
        "target": "const pagesBySlug = pages.reduce((acc, page) => ({ ...acc, [page.slug]: page }), {});",
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
        "target": "const membersByHandle = members.reduce((acc, member) => ({ ...acc, [member.handle]: member }), {});",
        "build": lambda values: {item["handle"]: item for item in values},
    },
]

HARD_TEMPLATES = [
    {
        "pattern": "for_of_orders_by_ref",
        "array_name": "orders",
        "output_name": "ordersByRef",
        "element_var": "order",
        "key_expr": "order.ref",
        "input_values": [
            [{"ref": "o-1", "total": 15}, {"ref": "o-2", "total": 19}],
            [{"ref": "o-3", "total": 7}],
            [],
        ],
        "original": """const ordersByRef = {};
for (const order of orders) {
  ordersByRef[order.ref] = order;
}""",
        "target": "const ordersByRef = orders.reduce((acc, order) => ({ ...acc, [order.ref]: order }), {});",
        "build": lambda values: {item["ref"]: item for item in values},
    },
    {
        "pattern": "indexed_accounts_by_email",
        "array_name": "accounts",
        "output_name": "accountsByEmail",
        "element_var": "account",
        "key_expr": "account.email",
        "input_values": [
            [{"email": "a@example.com", "tier": "pro"}, {"email": "b@example.com", "tier": "free"}],
            [{"email": "c@example.com", "tier": "team"}],
            [],
        ],
        "original": """const accountsByEmail = {};
for (let i = 0; i < accounts.length; i += 1) {
  accountsByEmail[accounts[i].email] = accounts[i];
}""",
        "target": "const accountsByEmail = accounts.reduce((acc, account) => ({ ...acc, [account.email]: account }), {});",
        "build": lambda values: {item["email"]: item for item in values},
    },
    {
        "pattern": "for_of_articles_by_slug",
        "array_name": "articles",
        "output_name": "articlesBySlug",
        "element_var": "article",
        "key_expr": "article.meta.slug",
        "input_values": [
            [{"meta": {"slug": "alpha"}, "title": "Alpha"}, {"meta": {"slug": "beta"}, "title": "Beta"}],
            [{"meta": {"slug": "docs"}, "title": "Docs"}],
            [],
        ],
        "original": """const articlesBySlug = {};
for (const article of articles) {
  articlesBySlug[article.meta.slug] = article;
}""",
        "target": "const articlesBySlug = articles.reduce((acc, article) => ({ ...acc, [article.meta.slug]: article }), {});",
        "build": lambda values: {item["meta"]["slug"]: item for item in values},
    },
    {
        "pattern": "indexed_sessions_by_token",
        "array_name": "sessions",
        "output_name": "sessionsByToken",
        "element_var": "session",
        "key_expr": "session.token",
        "input_values": [
            [{"token": "t1", "active": True}, {"token": "t2", "active": False}],
            [{"token": "t3", "active": True}],
            [],
        ],
        "original": """const sessionsByToken = {};
for (let idx = 0; idx < sessions.length; idx += 1) {
  const session = sessions[idx];
  sessionsByToken[session.token] = session;
}""",
        "target": "const sessionsByToken = sessions.reduce((acc, session) => ({ ...acc, [session.token]: session }), {});",
        "build": lambda values: {item["token"]: item for item in values},
    },
]

HARD_TEMPLATES_V2 = [
    {
        "pattern": "for_of_customers_by_normalized_email",
        "array_name": "customers",
        "output_name": "customersByNormalizedEmail",
        "element_var": "customer",
        "key_expr": "customer.email.trim().toLowerCase()",
        "input_values": [
            [
                {"email": " Ada@Example.com ", "name": "Ada"},
                {"email": "linus@example.com", "name": "Linus"},
            ],
            [{"email": " GRACE@EXAMPLE.COM ", "name": "Grace"}],
            [],
        ],
        "original": """const customersByNormalizedEmail = {};
for (const customer of customers) {
  const normalizedEmail = customer.email.trim().toLowerCase();
  customersByNormalizedEmail[normalizedEmail] = customer;
}""",
        "target": "const customersByNormalizedEmail = customers.reduce((acc, customer) => ({ ...acc, [customer.email.trim().toLowerCase()]: customer }), {});",
        "build": lambda values: {item["email"].strip().lower(): item for item in values},
    },
    {
        "pattern": "indexed_products_by_category_sku",
        "array_name": "products",
        "output_name": "productsByCategorySku",
        "element_var": "product",
        "key_expr": "`${product.category}:${product.sku}`",
        "input_values": [
            [
                {"category": "books", "sku": "sku-1", "price": 5},
                {"category": "games", "sku": "sku-2", "price": 9},
            ],
            [{"category": "audio", "sku": "sku-3", "price": 7}],
            [],
        ],
        "original": """const productsByCategorySku = {};
for (let i = 0; i < products.length; i += 1) {
  const product = products[i];
  const compositeKey = `${product.category}:${product.sku}`;
  productsByCategorySku[compositeKey] = product;
}""",
        "target": "const productsByCategorySku = products.reduce((acc, product) => ({ ...acc, [`${product.category}:${product.sku}`]: product }), {});",
        "build": lambda values: {f"{item['category']}:{item['sku']}": item for item in values},
    },
    {
        "pattern": "for_of_articles_by_author_slug",
        "array_name": "articles",
        "output_name": "articlesByAuthorSlug",
        "element_var": "article",
        "key_expr": "`${article.author.handle.toLowerCase()}:${article.slug}`",
        "input_values": [
            [
                {"author": {"handle": "Ada"}, "slug": "intro", "title": "Intro"},
                {"author": {"handle": "Linus"}, "slug": "systems", "title": "Systems"},
            ],
            [{"author": {"handle": "Grace"}, "slug": "docs", "title": "Docs"}],
            [],
        ],
        "original": """const articlesByAuthorSlug = {};
for (const article of articles) {
  const key = `${article.author.handle.toLowerCase()}:${article.slug}`;
  articlesByAuthorSlug[key] = article;
}""",
        "target": "const articlesByAuthorSlug = articles.reduce((acc, article) => ({ ...acc, [`${article.author.handle.toLowerCase()}:${article.slug}`]: article }), {});",
        "build": lambda values: {f"{item['author']['handle'].lower()}:{item['slug']}": item for item in values},
    },
    {
        "pattern": "indexed_sessions_by_user_token",
        "array_name": "sessions",
        "output_name": "sessionsByUserToken",
        "element_var": "session",
        "key_expr": "`${session.user.id}::${session.token}`",
        "input_values": [
            [
                {"user": {"id": "u1"}, "token": "t1", "active": True},
                {"user": {"id": "u2"}, "token": "t2", "active": False},
            ],
            [{"user": {"id": "u3"}, "token": "t3", "active": True}],
            [],
        ],
        "original": """const sessionsByUserToken = {};
for (let idx = 0; idx < sessions.length; idx += 1) {
  const session = sessions[idx];
  sessionsByUserToken[`${session.user.id}::${session.token}`] = session;
}""",
        "target": "const sessionsByUserToken = sessions.reduce((acc, session) => ({ ...acc, [`${session.user.id}::${session.token}`]: session }), {});",
        "build": lambda values: {f"{item['user']['id']}::{item['token']}": item for item in values},
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

HARD_PROMPT_VARIANTS = [
    (
        "Refactor this object-index loop to reduce.\n"
        "Keep the final binding name exactly `{output_name}`.\n"
        "Return one JavaScript statement only.\n"
        "```js\n{code}\n```"
    ),
    (
        "Rewrite this object-index builder in idiomatic JavaScript.\n"
        "Use `{array_name}.reduce(...)` and assign the result to `{output_name}`.\n"
        "Do not include comments, prose, or repeated statements.\n"
        "```js\n{code}\n```"
    ),
]

HARD_PROMPT_VARIANTS_V2 = [
    (
        "Rewrite this keyed object-index loop as one JavaScript statement.\n"
        "Keep the final binding name exactly `{output_name}`.\n"
        "Use `{array_name}.reduce(...)`.\n"
        "Preserve the derived key logic.\n"
        "```js\n{code}\n```"
    ),
    (
        "Convert this object-index loop into one reduce assignment.\n"
        "Do not explain anything. Do not repeat the statement.\n"
        "Expected binding: `{output_name}`.\n"
        "Keep the computed key behavior unchanged.\n"
        "```js\n{code}\n```"
    ),
    (
        "Refactor this loop to reduce while preserving behavior.\n"
        "Return only the final JavaScript statement assigning to `{output_name}`.\n"
        "Keep any normalization or composite-key logic intact.\n"
        "```js\n{code}\n```"
    ),
]


def eval_target(template: dict, values):
    return template["build"](values)


def make_row(idx: int, template: dict, rng: random.Random, *, prompt_variants=None, prefix: str = "js_reduce_obj") -> dict:
    prompt = rng.choice(prompt_variants or PROMPT_VARIANTS).format(
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
        "expected_key_expr": template["key_expr"],
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
    p.add_argument("--hard-val-size", type=int, default=128)
    p.add_argument("--probe-train-v2-size", type=int, default=256)
    p.add_argument("--hard-val-v2-size", type=int, default=128)
    p.add_argument("--seed", type=int, default=7)
    args = p.parse_args()

    rng = random.Random(args.seed)
    templates = TEMPLATES[:]
    train_rows = [make_row(i, rng.choice(templates), rng) for i in range(args.train_size)]
    val_rows = [make_row(args.train_size + i, rng.choice(templates), rng) for i in range(args.val_size)]
    hard_templates = HARD_TEMPLATES[:]
    hard_rows = [
        make_row(
            args.train_size + args.val_size + i,
            rng.choice(hard_templates),
            rng,
            prompt_variants=HARD_PROMPT_VARIANTS,
            prefix="js_reduce_obj_hard",
        )
        for i in range(args.hard_val_size)
    ]
    hard_v2_templates = HARD_TEMPLATES_V2[:]
    probe_train_v2_rows = [
        make_row(
            args.train_size + args.val_size + args.hard_val_size + i,
            rng.choice(hard_v2_templates),
            rng,
            prompt_variants=HARD_PROMPT_VARIANTS_V2,
            prefix="js_reduce_obj_probe_v2",
        )
        for i in range(args.probe_train_v2_size)
    ]
    hard_v2_rows = [
        make_row(
            args.train_size + args.val_size + args.hard_val_size + args.probe_train_v2_size + i,
            rng.choice(hard_v2_templates),
            rng,
            prompt_variants=HARD_PROMPT_VARIANTS_V2,
            prefix="js_reduce_obj_hard_v2",
        )
        for i in range(args.hard_val_v2_size)
    ]

    write_jsonl(train_rows, args.output_dir / "train.jsonl")
    write_jsonl(val_rows, args.output_dir / "val.jsonl")
    write_jsonl(hard_rows, args.output_dir / "hard_val.jsonl")
    write_jsonl(probe_train_v2_rows, args.output_dir / "probe_train_v2.jsonl")
    write_jsonl(hard_v2_rows, args.output_dir / "hard_val_v2.jsonl")

    summary = {
        "task_contract": "js_reduce_object_index_builder",
        "train_size": len(train_rows),
        "val_size": len(val_rows),
        "hard_val_size": len(hard_rows),
        "probe_train_v2_size": len(probe_train_v2_rows),
        "hard_val_v2_size": len(hard_v2_rows),
        "patterns": sorted({row["input_pattern"] for row in train_rows + val_rows}),
        "hard_patterns": sorted({row["input_pattern"] for row in hard_rows}),
        "probe_patterns_v2": sorted({row["input_pattern"] for row in probe_train_v2_rows}),
        "hard_v2_patterns": sorted({row["input_pattern"] for row in hard_v2_rows}),
        "output_dir": str(args.output_dir),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
