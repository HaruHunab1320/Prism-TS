import re
from dataclasses import dataclass


INTENT_RE = re.compile(r"\b(reduce|refactor|rewrite|functional|idiomatic|aggregation)\b", re.IGNORECASE)
FOR_RE = re.compile(r"\bfor\s*\(")
FOR_OF_RE = re.compile(r"\bfor\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+\w+")
REDUCE_RE = re.compile(r"\.\s*reduce\s*\(")
ACC_INIT_RE = re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^\n;]+)")
PUSH_RE = re.compile(r"\.\s*push\s*\(")


@dataclass
class RouteDecision:
    route: str
    route_confidence: float
    reason: str


def route_js_reduce_accumulator_refactor(prompt: str, code: str) -> RouteDecision:
    has_intent = bool(INTENT_RE.search(prompt))
    has_loop = bool(FOR_RE.search(code) or FOR_OF_RE.search(code))
    already_reduce = bool(REDUCE_RE.search(code))
    has_push = bool(PUSH_RE.search(code))
    code_lines = [line.strip() for line in code.splitlines() if line.strip()]
    for_idx = next((i for i, line in enumerate(code_lines) if line.startswith("for " ) or line.startswith("for(") or line.startswith("for (")), -1)
    pre_loop = "\n".join(code_lines[:for_idx]) if for_idx >= 0 else code
    loop_body = "\n".join(line for line in code_lines[for_idx + 1 :] if not line.startswith("}")) if for_idx >= 0 else code
    init_matches = ACC_INIT_RE.findall(pre_loop)
    accumulator_var = init_matches[0][0] if init_matches else None
    has_single_init = accumulator_var is not None
    maybe_no_update = True
    maybe_multi_acc = False
    if accumulator_var:
        acc_update_re = re.compile(rf"\b{re.escape(accumulator_var)}\s*(\+=|\*=|=)\s*")
        maybe_no_update = not bool(acc_update_re.search(loop_body))
        other_update_re = re.compile(r"\b([A-Za-z_$][\w$]*)\s*(\+=|\*=)\s*")
        other_updated = {name for name, _op in other_update_re.findall(loop_body) if name != accumulator_var}
        maybe_multi_acc = len(other_updated) > 0

    if already_reduce:
        return RouteDecision("fallback", 0.05, "code already uses reduce")
    if not has_intent:
        return RouteDecision("fallback", 0.10, "prompt does not request reduce-style refactor")
    if has_push:
        return RouteDecision("fallback", 0.15, "looks map-like instead of accumulator-like")
    if not has_loop or not has_single_init or maybe_no_update:
        return RouteDecision("fallback", 0.10, "missing accumulator loop shape")
    if maybe_multi_acc:
        return RouteDecision("fallback", 0.20, "multiple accumulator updates detected")
    return RouteDecision("js_reduce_accumulator_refactor", 0.95, "matches narrow reduce contract")
