import argparse
import json
from pathlib import Path

from lumina_micro_demo.runtime.orchestrator import build_demo_trace


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a route/planning trace for the Lumina micro demo.")
    parser.add_argument("--prompt", required=True, help="User prompt for the demo request.")
    parser.add_argument("--input", required=True, help="Path to a JavaScript source file.")
    parser.add_argument("--output", help="Optional path to write the JSON trace.")
    args = parser.parse_args()

    source_path = Path(args.input)
    source_code = source_path.read_text(encoding="utf-8")
    trace = build_demo_trace(args.prompt, source_code)
    payload = json.dumps(trace.to_dict(), indent=2)
    if args.output:
        Path(args.output).write_text(payload + "\n", encoding="utf-8")
    print(payload)


if __name__ == "__main__":
    main()
