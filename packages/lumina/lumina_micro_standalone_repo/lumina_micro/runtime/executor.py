import json
import re
import subprocess
from dataclasses import dataclass
from typing import Any

from lumina_micro.verifiers.verify_js_array_loop_to_map import verify_js_array_loop_to_map
from lumina_micro.verifiers.verify_js_reduce_accumulator_refactor import (
    verify_js_reduce_accumulator_refactor,
)
from lumina_micro.verifiers.verify_js_reduce_object_index_builder import (
    verify_js_reduce_object_index_builder,
)


FOR_OF_RE = re.compile(r"for\s*\(\s*(?:const|let|var)\s+(?P<item>[A-Za-z_$][\w$]*)\s+of\s+(?P<array>[A-Za-z_$][\w$]*)\s*\)")
INIT_ARRAY_RE = re.compile(r"(?:const|let|var)\s+(?P<out>[A-Za-z_$][\w$]*)\s*=\s*\[\s*\]\s*;")
INIT_SCALAR_RE = re.compile(r"(?:const|let|var)\s+(?P<out>[A-Za-z_$][\w$]*)\s*=\s*(?P<init>[^;]+);")
INIT_OBJECT_RE = re.compile(r"(?:const|let|var)\s+(?P<out>[A-Za-z_$][\w$]*)\s*=\s*\{\s*\}\s*;")
PUSH_EXPR_RE = re.compile(r"(?P<out>[A-Za-z_$][\w$]*)\.push\((?P<expr>.+?)\);", re.DOTALL)
ACC_UPDATE_RE = re.compile(r"(?P<out>[A-Za-z_$][\w$]*)\s*(?P<op>\+=|\*=|-=)\s*(?P<expr>.+?);", re.DOTALL)
ACC_ASSIGN_RE = re.compile(r"(?P<out>[A-Za-z_$][\w$]*)\s*=\s*(?P<expr>.+?);", re.DOTALL)
OBJECT_ASSIGN_RE = re.compile(r"(?P<out>[A-Za-z_$][\w$]*)\[(?P<key>.+?)\]\s*=\s*(?P<value>.+?);", re.DOTALL)
PROP_CHAIN_RE = re.compile(r"\b(?P<var>[A-Za-z_$][\w$]*)\.(?P<chain>[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)")
STRING_METHOD_RE = re.compile(r"\.(trim|toUpperCase|toLowerCase|slice|padStart|padEnd)\s*\(")


@dataclass
class ContractContext:
    prompt: str
    verifier_row: dict[str, Any]


@dataclass
class ExecutionResult:
    generated_code: str | None
    verified: bool
    syntax_valid: bool
    contract_marker_present: bool
    answer_confidence: float
    control_action: str
    details: dict[str, Any]
    notes: list[str]


def _run_node_json(script: str) -> dict[str, Any] | None:
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=5,
    )
    if proc.returncode != 0:
        return None
    try:
        return json.loads(proc.stdout.strip().splitlines()[-1])
    except Exception:
        return None


def _assignment_line(code: str) -> str:
    return "\n".join(line.strip() for line in code.strip().splitlines() if line.strip())


def _extract_loop_binding(code: str) -> tuple[str, str] | None:
    match = FOR_OF_RE.search(code)
    if match:
        return match.group("item"), match.group("array")
    index_match = re.search(
        r"for\s*\(\s*(?:let|var)\s+(?P<idx>[A-Za-z_$][\w$]*)\s*=\s*0\s*;\s*"
        r"(?P<array>[A-Za-z_$][\w$]*)\.length",
        code,
    )
    if index_match:
        return index_match.group("idx"), index_match.group("array")
    return None


def _default_value_for_path(path: str, row_idx: int) -> Any:
    leaf = path.split(".")[-1].lower()
    if leaf in {"id", "sku", "token"}:
        return f"{leaf}_{row_idx}"
    if leaf in {"name", "title", "slug", "category", "handle", "email"}:
        return f"{leaf}_{row_idx}"
    if leaf in {"age", "count", "score", "price", "points", "quantity"}:
        return row_idx + 1
    return f"value_{row_idx}"


def _set_nested(obj: dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    cur = obj
    for part in parts[:-1]:
        cur = cur.setdefault(part, {})
    cur[parts[-1]] = value


def _build_items_for_expression(code: str, item_var: str, *, count: int = 3) -> list[Any]:
    method_names = {"trim", "toUpperCase", "toLowerCase", "slice", "padStart", "padEnd"}
    prop_paths = set()
    for match in PROP_CHAIN_RE.finditer(code):
        if match.group("var") != item_var:
            continue
        chain = match.group("chain")
        parts = chain.split(".")
        while parts and parts[-1] in method_names:
            parts.pop()
        if parts:
            prop_paths.add(".".join(parts))
    prop_paths = sorted(prop_paths)
    if not prop_paths:
        if STRING_METHOD_RE.search(code):
            return [" alpha ", "beta ", " Gamma"][:count]
        return [1, 2, 3][:count]
    items = []
    for idx in range(count):
        item: dict[str, Any] = {}
        for path in prop_paths:
            _set_nested(item, path, _default_value_for_path(path, idx))
        items.append(item)
    return items


def _oracle_tests_from_input(input_code: str, array_name: str, output_name: str, sample_input: list[Any]) -> list[dict[str, Any]]:
    script = f"""
const {array_name} = {json.dumps(sample_input)};
{input_code}
console.log(JSON.stringify({{"expected_output": {output_name}}}));
"""
    row = _run_node_json(script)
    if row is None or "expected_output" not in row:
        return []
    return [{"input": sample_input, "expected_output": row["expected_output"]}]


def _rewrite_map(code: str) -> tuple[str | None, dict[str, Any] | None]:
    out_match = INIT_ARRAY_RE.search(code)
    push_match = PUSH_EXPR_RE.search(code)
    binding = _extract_loop_binding(code)
    if not out_match or not push_match or not binding:
        return None, None
    iter_var, array_var = binding
    out_var = out_match.group("out")
    expr = push_match.group("expr").strip()
    if iter_var != array_var and re.search(rf"\b{re.escape(array_var)}\s*\[\s*{re.escape(iter_var)}\s*\]", expr):
        replacement_var = iter_var[:-1] if iter_var.endswith("i") else "item"
        expr = re.sub(rf"\b{re.escape(array_var)}\s*\[\s*{re.escape(iter_var)}\s*\]", replacement_var, expr)
        iter_var = replacement_var
    generated = f"const {out_var} = {array_var}.map(({iter_var}) => {expr});"
    sample_input = _build_items_for_expression(expr, iter_var)
    row = {
        "expected_array_var": array_var,
        "expected_output_var": out_var,
        "expected_iter_var": iter_var,
        "expected_map_expr": expr,
        "tests": _oracle_tests_from_input(code, array_var, out_var, sample_input),
    }
    return generated, row


def _rewrite_reduce_accumulator(code: str) -> tuple[str | None, dict[str, Any] | None]:
    init_match = INIT_SCALAR_RE.search(code)
    binding = _extract_loop_binding(code)
    if not init_match or not binding:
        return None, None
    out_var = init_match.group("out")
    init_value = init_match.group("init").strip()
    iter_var, array_var = binding
    update_match = ACC_UPDATE_RE.search(code)
    expr = None
    if update_match and update_match.group("out") == out_var:
        op = update_match.group("op")
        rhs = update_match.group("expr").strip()
        expr = {
            "+=": f"acc + {rhs}",
            "*=": f"acc * {rhs}",
            "-=": f"acc - {rhs}",
        }[op]
    else:
        assign_match = ACC_ASSIGN_RE.search(code)
        if assign_match and assign_match.group("out") == out_var:
            rhs = assign_match.group("expr").strip()
            expr = rhs.replace(out_var, "acc")
    if expr is None:
        return None, None
    generated = f"const {out_var} = {array_var}.reduce((acc, {iter_var}) => {expr}, {init_value});"
    sample_input = _build_items_for_expression(expr, iter_var)
    row = {
        "expected_array_var": array_var,
        "expected_output_var": out_var,
        "expected_iter_var": iter_var,
        "expected_reduce_expr": expr,
        "expected_initializer": init_value,
        "tests": _oracle_tests_from_input(code, array_var, out_var, sample_input),
    }
    return generated, row


def _rewrite_reduce_object_index(code: str) -> tuple[str | None, dict[str, Any] | None]:
    init_match = INIT_OBJECT_RE.search(code)
    assign_match = OBJECT_ASSIGN_RE.search(code)
    binding = _extract_loop_binding(code)
    if not init_match or not assign_match or not binding:
        return None, None
    out_var = init_match.group("out")
    iter_var, array_var = binding
    key_expr = assign_match.group("key").strip()
    value_expr = assign_match.group("value").strip()
    generated = f"const {out_var} = {array_var}.reduce((acc, {iter_var}) => ({{ ...acc, [{key_expr}]: {value_expr} }}), {{}});"
    sample_input = _build_items_for_expression(f"{key_expr} {value_expr}", iter_var)
    row = {
        "expected_array_var": array_var,
        "expected_output_var": out_var,
        "expected_iter_var": iter_var,
        "expected_key_expr": key_expr,
        "expected_value_expr": value_expr,
        "tests": _oracle_tests_from_input(code, array_var, out_var, sample_input),
    }
    return generated, row


BUILDERS = {
    "js_array_loop_to_map": _rewrite_map,
    "js_reduce_accumulator_refactor": _rewrite_reduce_accumulator,
    "js_reduce_object_index_builder": _rewrite_reduce_object_index,
}

VERIFIERS = {
    "js_array_loop_to_map": verify_js_array_loop_to_map,
    "js_reduce_accumulator_refactor": verify_js_reduce_accumulator_refactor,
    "js_reduce_object_index_builder": verify_js_reduce_object_index_builder,
}


def build_contract_context(contract: str, input_code: str) -> ContractContext | None:
    builder = BUILDERS.get(contract)
    if builder is None:
        return None
    _generated, row = builder(input_code)
    if not row or not row.get("tests"):
        return None
    if contract == "js_array_loop_to_map":
        prompt = f"Refactor this loop to use map:\n```js\n{input_code}\n```"
    elif contract == "js_reduce_accumulator_refactor":
        prompt = f"Refactor this loop to use reduce:\n```js\n{input_code}\n```"
    else:
        prompt = f"Refactor this loop into one reduce-based object index assignment:\n```js\n{input_code}\n```"
    row["prompt"] = prompt
    return ContractContext(prompt=prompt, verifier_row=row)


def execute_contract(contract: str, input_code: str) -> ExecutionResult:
    verifier = VERIFIERS.get(contract)
    builder = BUILDERS.get(contract)
    if verifier is None or builder is None:
        return ExecutionResult(None, False, False, False, 0.0, "fallback", {}, ["Unsupported contract."])
    context = build_contract_context(contract, input_code)
    if context is None:
        return ExecutionResult(None, False, False, False, 0.0, "fallback", {}, ["Could not synthesize verifier inputs from source block."])
    generated, _row = builder(input_code)
    verify_result = verifier(generated, context.verifier_row)
    contract_marker_present = bool(verify_result.uses_map if hasattr(verify_result, "uses_map") else verify_result.uses_reduce)
    verified = bool(verify_result.passed)
    confidence = 1.0 if verified else 0.0
    action = "accepted" if verified else "fallback"
    details = {
        "verifier_row": context.verifier_row,
        "verification": {
            "syntax_valid": verify_result.syntax_valid,
            "contract_marker_present": contract_marker_present,
            "passed": verify_result.passed,
            "details": verify_result.details,
        },
    }
    notes = []
    if not verified:
        notes.append("Verifier rejected the generated rewrite.")
    return ExecutionResult(
        generated_code=_assignment_line(generated),
        verified=verified,
        syntax_valid=bool(verify_result.syntax_valid),
        contract_marker_present=contract_marker_present,
        answer_confidence=confidence,
        control_action=action,
        details=details,
        notes=notes,
    )
