import re
from dataclasses import dataclass


INTENT_RE = re.compile(r"\b(map|refactor|rewrite|functional|idiomatic)\b", re.IGNORECASE)
PUSH_RE = re.compile(r"\.\s*push\s*\(")
MAP_RE = re.compile(r"\.\s*map\s*\(")
FOR_RE = re.compile(r"\bfor\s*\(")
FOR_OF_RE = re.compile(r"\bfor\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+\w+")
FILTERISH_RE = re.compile(r"\bif\s*\(")
REDUCE_HINT_RE = re.compile(r"\b(sum|total|accumulator|reduce)\b", re.IGNORECASE)


@dataclass
class RouteDecision:
    route: str
    route_confidence: float
    reason: str


def route_js_array_loop_to_map(prompt: str, code: str) -> RouteDecision:
    text = f"{prompt}\n{code}"
    has_intent = bool(INTENT_RE.search(prompt))
    has_loop = bool(FOR_RE.search(code) or FOR_OF_RE.search(code))
    has_push = bool(PUSH_RE.search(code))
    already_map = bool(MAP_RE.search(code))
    maybe_filter = bool(FILTERISH_RE.search(code))
    maybe_reduce = bool(REDUCE_HINT_RE.search(text))

    if already_map:
        return RouteDecision("fallback", 0.05, "code already uses map")
    if not has_intent:
        return RouteDecision("fallback", 0.10, "prompt does not request map-style refactor")
    if not has_loop or not has_push:
        return RouteDecision("fallback", 0.10, "missing loop+push transformation shape")
    if maybe_reduce:
        return RouteDecision("fallback", 0.15, "reduce-like request")
    if maybe_filter:
        return RouteDecision("fallback", 0.20, "conditional push may be filter-like")
    return RouteDecision("js_array_loop_to_map", 0.95, "matches narrow loop-to-map contract")
