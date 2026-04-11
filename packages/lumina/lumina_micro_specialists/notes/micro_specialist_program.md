# Micro-Specialist Program

## Thesis

Lumina is more likely to work with narrow, verifier-backed specialists than
with broad domain buckets.

Bad unit of specialization:

- `code`
- `math`
- `general`

Better unit of specialization:

- one tightly scoped task contract with a known verifier

Examples:

- `js_array_loop_to_map`
- `js_reduce_accumulator_refactor`
- `python_pandas_groupby_aggregate`
- `sql_select_where_to_join_fix`

## Selection criteria for a micro-specialist

A candidate contract is worth building only if it has all of:

1. narrow and easy to detect
2. executable or otherwise strongly verifiable
3. enough data can be generated or curated cheaply
4. common enough that solving it is useful
5. different enough from nearby contracts that routing is defensible

## First build rule

Do not train from scratch.

Use:

- one strong base code model
- one adapter / LoRA per contract
- one verifier per contract
- one high-precision router

## First product rule

The user should not need to know the contract name.

The runtime should:

1. detect whether the request fits the contract
2. run the specialist only if the fit is strong
3. verify the output
4. fall back cleanly if the specialist fails

## Promotion rule

A micro-specialist is only worth keeping if it improves:

- verified task success
- or selective-answer quality under a learned correctness estimate

without making the end-to-end path brittle
