import re
from dataclasses import dataclass


INTENT_RE = re.compile(r"\b(filter|refactor|rewrite|functional|idiomatic|selection)\b", re.IGNORECASE)
FOR_RE = re.compile(r"\bfor\s*\(")
FOR_OF_RE = re.compile(r"\bfor\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+\w+")
FILTER_RE = re.compile(r"\.\s*filter\s*\(")
REDUCE_RE = re.compile(r"\.\s*reduce\s*\(")
MAP_RE = re.compile(r"\.\s*map\s*\(")
EMPTY_ARRAY_INIT_RE = re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[\s*\]")
IF_RE = re.compile(r"\bif\s*\(")
PUSH_RE = re.compile(r"\b([A-Za-z_$][\w$]*)\.\s*push\s*\(")


@dataclass
class RouteDecision:
    route: str
    route_confidence: float
    reason: str


def route_js_filter_predicate_refactor(prompt: str, code: str) -> RouteDecision:
    has_intent = bool(INTENT_RE.search(prompt))
    has_loop = bool(FOR_RE.search(code) or FOR_OF_RE.search(code))
    already_filter = bool(FILTER_RE.search(code))
    mixed_hof = bool(REDUCE_RE.search(code) or MAP_RE.search(code))
    has_if = bool(IF_RE.search(code))
    init_match = EMPTY_ARRAY_INIT_RE.search(code)
    push_match = PUSH_RE.search(code)
    same_binding = bool(init_match and push_match and init_match.group(1) == push_match.group(1))

    if already_filter:
        return RouteDecision("fallback", 0.05, "code already uses filter")
    if mixed_hof:
        return RouteDecision("fallback", 0.10, "code already uses another higher-order method")
    if not has_intent:
        return RouteDecision("fallback", 0.10, "prompt does not request filter-style refactor")
    if not has_loop or not has_if or not same_binding:
        return RouteDecision("fallback", 0.15, "missing narrow filter loop shape")
    return RouteDecision("js_filter_predicate_refactor", 0.95, "matches narrow filter contract")
