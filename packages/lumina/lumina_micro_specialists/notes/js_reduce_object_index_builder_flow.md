# `js_reduce_object_index_builder` Flow

1. User asks to refactor a loop that builds an object lookup.
2. Router checks for the narrow object-index loop shape.
3. Specialist returns one reduce assignment.
4. Verifier checks syntax, `.reduce(...)`, and behavior tests.
5. If verification fails, runtime falls back.
