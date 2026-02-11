#!/usr/bin/env python3
"""
Lumina PoC v2 - Scaled Local Training

Run the full v2 pipeline:
1. Generate training data (50K+ samples)
2. Train specialists with proper GPT-2 tokenizer
3. Train router
4. Evaluate calibration and quality

Usage:
    python run_v2.py                    # Run full pipeline (medium size)
    python run_v2.py --size small       # Quick iteration (~20M params)
    python run_v2.py --size large       # Higher quality (~100M params)
    python run_v2.py --skip-data        # Skip data generation
    python run_v2.py --eval-only        # Only run evaluation
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path

# Ensure we can import config
sys.path.insert(0, str(Path(__file__).parent))

from config_v2 import (
    DATASETS_DIR, OUTPUTS_DIR, MODEL_SIZES, DOMAINS, THRESHOLDS
)


def run_command(cmd: list, desc: str) -> bool:
    """Run a command with status reporting."""
    print(f"\n{'='*60}")
    print(f" {desc}")
    print(f"{'='*60}")
    print(f" Command: {' '.join(cmd)}")
    print()

    start = time.time()
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    elapsed = time.time() - start

    if result.returncode == 0:
        print(f"\n Completed in {elapsed:.1f}s")
        return True
    else:
        print(f"\n FAILED after {elapsed:.1f}s (exit code {result.returncode})")
        return False


def generate_data() -> bool:
    """Generate v2 training data."""
    return run_command(
        [sys.executable, "data/generate_v2.py"],
        "Generating v2 Training Data"
    )


def train_specialist(domain: str, size: str, epochs: int, batch_size: int) -> bool:
    """Train a single specialist."""
    return run_command(
        [
            sys.executable, "training/train_v2.py",
            "--domain", domain,
            "--size", size,
            "--epochs", str(epochs),
            "--batch-size", str(batch_size),
        ],
        f"Training {domain.upper()} Specialist ({size})"
    )


def train_router(size: str, epochs: int, batch_size: int) -> bool:
    """Train the domain router."""
    # Router training script (we'll create if needed)
    router_script = Path(__file__).parent / "training" / "train_router_v2.py"

    if not router_script.exists():
        print(f"Note: Router training script not found at {router_script}")
        print("Skipping router training for now...")
        return True

    return run_command(
        [
            sys.executable, str(router_script),
            "--size", size,
            "--epochs", str(epochs),
            "--batch-size", str(batch_size),
        ],
        f"Training Router ({size})"
    )


def evaluate_models(size: str) -> bool:
    """Evaluate all trained models."""
    eval_script = Path(__file__).parent / "evaluation" / "eval_v2.py"

    if not eval_script.exists():
        print(f"Note: Evaluation script not found at {eval_script}")
        print("Running basic evaluation...")
        return basic_evaluation(size)

    return run_command(
        [sys.executable, str(eval_script), "--size", size],
        "Evaluating Models"
    )


def basic_evaluation(size: str) -> bool:
    """Basic evaluation when full eval script not available."""
    import json

    print("\n" + "="*60)
    print(" Basic Model Evaluation")
    print("="*60)

    results = {}

    for domain in DOMAINS:
        output_dir = OUTPUTS_DIR / f"{domain}_specialist_{size}"
        config_path = output_dir / "config.json"
        history_path = output_dir / "history.json"

        if not config_path.exists():
            print(f"\n{domain}: NOT TRAINED")
            continue

        with open(config_path) as f:
            config = json.load(f)

        print(f"\n{domain.upper()} Specialist:")
        print(f"  Best val loss: {config.get('best_val_loss', 'N/A'):.4f}")

        if history_path.exists():
            with open(history_path) as f:
                history = json.load(f)
            if history:
                final = history[-1]
                print(f"  Final accuracy: {final['val'].get('acc', 0):.2%}")
                print(f"  Final avg conf: {final['val'].get('avg_conf', 0):.2f}")
                print(f"  Calibration: {final['val'].get('calib', 0):.4f}")

        results[domain] = config

    # Summary
    print("\n" + "="*60)
    print(" Summary")
    print("="*60)

    all_losses = [r.get('best_val_loss', float('inf')) for r in results.values()]
    if all_losses:
        avg_loss = sum(all_losses) / len(all_losses)
        print(f"Average best val loss: {avg_loss:.4f}")
        print(f"Models trained: {len(results)}/{len(DOMAINS)}")

    return True


def interactive_demo(size: str) -> None:
    """Run interactive demo with trained models."""
    print("\n" + "="*60)
    print(" Interactive Demo")
    print("="*60)

    try:
        # Try to load transformers for tokenizer
        from transformers import GPT2Tokenizer
        HAS_TOKENIZER = True
    except ImportError:
        print("Warning: transformers not installed. Demo requires it.")
        print("Install with: pip install transformers")
        return

    import mlx.core as mx
    from models.base import TinySpecialist
    from config_v2 import MODEL_SIZES

    model_config = MODEL_SIZES[size]
    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    tokenizer.pad_token = tokenizer.eos_token

    # Load a specialist
    domain = "prism"  # Default to prism
    output_dir = OUTPUTS_DIR / f"{domain}_specialist_{size}"
    weights_path = output_dir / "model.safetensors"

    if not weights_path.exists():
        print(f"No trained model found at {weights_path}")
        return

    print(f"Loading {domain} specialist...")
    model = TinySpecialist(model_config)
    weights = mx.load(str(weights_path))
    model.load_weights(list(weights.items()))

    print("\nModel loaded! Enter queries (Ctrl+C to exit):")
    print()

    while True:
        try:
            query = input("Query: ").strip()
            if not query:
                continue

            # Tokenize
            text = f"Question: {query}\nAnswer:"
            tokens = tokenizer.encode(text, max_length=128, truncation=True)
            input_ids = mx.array([tokens])

            # Generate
            output_ids, confidence = model.generate(
                input_ids, max_new_tokens=100, temperature=0.7
            )

            # Decode
            response = tokenizer.decode(output_ids[0].tolist(), skip_special_tokens=True)

            print(f"\nResponse: {response}")
            print(f"Confidence: {confidence.overall:.2%} (overall)")
            print(f"  Epistemic: {confidence.epistemic:.2%}")
            print(f"  Aleatoric: {confidence.aleatoric:.2%}")
            print(f"  OOD: {confidence.distribution_shift:.2%}")
            print(f"  Type: {confidence.primary_type}")
            print()

        except KeyboardInterrupt:
            print("\n\nExiting demo.")
            break
        except Exception as e:
            print(f"Error: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Lumina PoC v2 - Scaled Local Training",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Model Sizes:
  small   - ~20M params, fast iteration (any Mac)
  medium  - ~50M params, good balance (M1/M2 8GB+)
  large   - ~100M params, higher quality (16GB+ RAM)
  xlarge  - ~200M params, best local quality (32GB+ RAM)

Examples:
  python run_v2.py                      # Full pipeline, medium size
  python run_v2.py --size small         # Quick test run
  python run_v2.py --domains prism      # Train only prism specialist
  python run_v2.py --skip-data --size large  # Large models, existing data
        """
    )

    parser.add_argument("--size", type=str, default="medium",
                        choices=["small", "medium", "large", "xlarge"],
                        help="Model size (default: medium)")
    parser.add_argument("--epochs", type=int, default=None,
                        help="Override epochs (default: 10/small, 20/medium, 30/large)")
    parser.add_argument("--batch-size", type=int, default=None,
                        help="Override batch size (default: 16/small, 8/medium+)")
    parser.add_argument("--domains", type=str, nargs="+", default=None,
                        choices=DOMAINS + ["all"],
                        help="Domains to train (default: all)")
    parser.add_argument("--skip-data", action="store_true",
                        help="Skip data generation")
    parser.add_argument("--eval-only", action="store_true",
                        help="Only run evaluation")
    parser.add_argument("--demo", action="store_true",
                        help="Run interactive demo after training")

    args = parser.parse_args()

    # Set defaults based on size
    if args.epochs is None:
        args.epochs = {"small": 10, "medium": 20, "large": 30, "xlarge": 30}[args.size]
    if args.batch_size is None:
        args.batch_size = {"small": 16, "medium": 8, "large": 4, "xlarge": 2}[args.size]
    if args.domains is None or "all" in args.domains:
        args.domains = DOMAINS

    print("\n" + "="*60)
    print(" Lumina PoC v2 - Scaled Local Training")
    print("="*60)
    print(f"\nConfiguration:")
    print(f"  Model size: {args.size} (~{MODEL_SIZES[args.size].approx_params}M params)")
    print(f"  Epochs: {args.epochs}")
    print(f"  Batch size: {args.batch_size}")
    print(f"  Domains: {', '.join(args.domains)}")
    print()

    start_time = time.time()

    # Step 1: Generate data
    if not args.eval_only and not args.skip_data:
        if not generate_data():
            print("\nData generation failed!")
            sys.exit(1)

    # Step 2: Train specialists
    if not args.eval_only:
        for domain in args.domains:
            if not train_specialist(domain, args.size, args.epochs, args.batch_size):
                print(f"\nTraining {domain} specialist failed!")
                # Continue with other domains

    # Step 3: Evaluate
    if not evaluate_models(args.size):
        print("\nEvaluation failed!")

    # Total time
    total_time = time.time() - start_time
    hours = int(total_time // 3600)
    minutes = int((total_time % 3600) // 60)
    seconds = int(total_time % 60)

    print("\n" + "="*60)
    print(" Training Complete!")
    print("="*60)
    print(f"\nTotal time: {hours}h {minutes}m {seconds}s")
    print(f"Outputs saved to: {OUTPUTS_DIR}")

    # Step 4: Optional demo
    if args.demo:
        interactive_demo(args.size)


if __name__ == "__main__":
    main()
