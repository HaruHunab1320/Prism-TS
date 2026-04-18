import json
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class VerifyResult:
    syntax_valid: bool
    uses_reduce: bool
    passed: bool
    details: dict[str, Any]


def _node_eval(script: str, timeout_sec: int = 5) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=timeout_sec,
    )


def parses_as_js(code: str) -> bool:
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "candidate.mjs"
        path.write_text(code, encoding="utf-8")
        proc = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True, timeout=5)
        return proc.returncode == 0


def run_contract_tests(code: str, array_name: str, output_name: str, tests: list[dict[str, Any]]) -> tuple[bool, list[dict[str, Any]]]:
    test_results = []
    for case in tests:
        input_json = json.dumps(case["input"])
        expected_json = json.dumps(case["expected_output"])
        script = f"""
const {array_name} = {input_json};
{code}
const actual = {output_name};
const expected = {expected_json};
const passed = JSON.stringify(actual) === JSON.stringify(expected);
console.log(JSON.stringify({{ actual, expected, passed }}));
"""
        proc = _node_eval(script)
        if proc.returncode != 0:
            test_results.append({"passed": False, "stderr": proc.stderr.strip()})
            continue
        try:
            row = json.loads(proc.stdout.strip().splitlines()[-1])
        except Exception:
            row = {"passed": False, "stdout": proc.stdout.strip(), "stderr": proc.stderr.strip()}
        test_results.append(row)
    passed = all(bool(row.get("passed")) for row in test_results)
    return passed, test_results


def verify_js_reduce_object_index_builder(code: str, row: dict[str, Any]) -> VerifyResult:
    syntax_valid = parses_as_js(code)
    uses_reduce = ".reduce(" in code or ".reduce (" in code
    passed = False
    test_results = []
    if syntax_valid and uses_reduce:
        passed, test_results = run_contract_tests(code, row["expected_array_var"], row["expected_output_var"], row["tests"])
    return VerifyResult(syntax_valid=syntax_valid, uses_reduce=uses_reduce, passed=passed, details={"tests": test_results})
