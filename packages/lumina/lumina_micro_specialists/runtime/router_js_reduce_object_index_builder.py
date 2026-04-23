import re
from dataclasses import dataclass


INTENT_RE = re.compile(r"\b(reduce|refactor|rewrite|functional|idiomatic|index|lookup|dictionary|map)\b", re.IGNORECASE)
FOR_RE = re.compile(r"\bfor\s*\(")
FOR_OF_RE = re.compile(r"\bfor\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+\w+")
REDUCE_RE = re.compile(r"\.\s*reduce\s*\(")
MAP_RE = re.compile(r"\.\s*map\s*\(")
FILTER_RE = re.compile(r"\.\s*filter\s*\(")
OBJECT_INIT_RE = re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{\s*\}")
PUSH_RE = re.compile(r"\.\s*push\s*\(")


@dataclass
class RouteDecision:
    route: str
    route_confidence: float
    reason: str


def route_js_reduce_object_index_builder(prompt: str, code: str) -> RouteDecision:
    has_intent = bool(INTENT_RE.search(prompt))
    has_loop = bool(FOR_RE.search(code) or FOR_OF_RE.search(code))
    already_reduce = bool(REDUCE_RE.search(code))
    mixed_hof = bool(MAP_RE.search(code) or FILTER_RE.search(code))
    init_match = OBJECT_INIT_RE.search(code)
    has_push = bool(PUSH_RE.search(code))
    same_binding = False
    if init_match:
        binding = init_match.group(1)
        same_binding = f"{binding}[" in code and "] =" in code

    if already_reduce:
        return RouteDecision("fallback", 0.05, "code already uses reduce")
    if mixed_hof or has_push:
        return RouteDecision("fallback", 0.10, "code shape matches a different contract")
    if not has_intent:
        return RouteDecision("fallback", 0.10, "prompt does not request reduce-style refactor")
    if not has_loop or not same_binding:
        return RouteDecision("fallback", 0.15, "missing narrow object-index loop shape")
    return RouteDecision("js_reduce_object_index_builder", 0.95, "matches narrow reduce object-index contract")
