#!/usr/bin/env python3
"""
Append an experiment entry to logs/training_log.md.

Example:
  python tools/log_run.py \
    --title "GPT2 conf head n=2" \
    --goal "Improve calibration" \
    --command "python -m training.train_gpt2_confidence ..." \
    --results "ECE(raw)=0.72, MSE=0.06" \
    --notes "Unfreeze-n 2 helped."
"""

import argparse
from datetime import datetime
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", required=True)
    parser.add_argument("--goal", default="")
    parser.add_argument("--command", default="")
    parser.add_argument("--results", default="")
    parser.add_argument("--notes", default="")
    parser.add_argument("--log", default="logs/training_log.md")
    args = parser.parse_args()

    log_path = Path(__file__).parent.parent / args.log
    log_path.parent.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    entry = [
        f"\n## {args.title}",
        f"- Date: {timestamp}",
    ]
    if args.goal:
        entry.append(f"- Goal: {args.goal}")
    if args.command:
        entry.append("- Command:")
        entry.append("```bash")
        entry.append(args.command)
        entry.append("```")
    if args.results:
        entry.append(f"- Results: {args.results}")
    if args.notes:
        entry.append(f"- Notes: {args.notes}")

    with log_path.open("a") as f:
        f.write("\n".join(entry) + "\n")

    print(f"Appended to {log_path}")


if __name__ == "__main__":
    main()
