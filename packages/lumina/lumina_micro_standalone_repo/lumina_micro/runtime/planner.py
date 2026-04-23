import re
from dataclasses import dataclass


BLOCK_START_RE = re.compile(r"^\s*(?:const|let|var)\s+.*(?:\[\]|\{\}|[-+]?\d+|''|\"\")\s*;?\s*$")
FOR_LINE_RE = re.compile(r"^\s*for\s*\(")


@dataclass
class PlannedBlock:
    start_line: int
    end_line: int
    code: str


def extract_transform_blocks(source_code: str) -> list[PlannedBlock]:
    lines = source_code.splitlines()
    blocks: list[PlannedBlock] = []
    i = 0
    while i < len(lines):
        if not BLOCK_START_RE.match(lines[i]):
            i += 1
            continue
        start = i
        j = i + 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        if j >= len(lines) or not FOR_LINE_RE.match(lines[j]):
            i += 1
            continue
        brace_depth = lines[j].count("{") - lines[j].count("}")
        end = j
        k = j + 1
        while k < len(lines):
            brace_depth += lines[k].count("{") - lines[k].count("}")
            end = k
            if brace_depth <= 0:
                break
            k += 1
        block = "\n".join(lines[start : end + 1]).strip()
        blocks.append(PlannedBlock(start_line=start + 1, end_line=end + 1, code=block))
        i = end + 1
    return blocks
