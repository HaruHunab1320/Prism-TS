"""
Evaluate different sampling strategies for Phase 5.

Compare:
1. Greedy (baseline)
2. Fixed temperature
3. Fixed nucleus (top-p)
4. Confidence-guided (our approach)
"""

import argparse
import json
from pathlib import Path
from collections import Counter
from typing import List

import mlx.core as mx

from .config import get_config
from .model import LuminaModel
from .train_phase4 import LuminaPhase4Model
from .data import load_tokenizer
from .confidence_sampling import (
    SamplingConfig,
    ConfidenceGuidedSampler,
    ConfidenceGuidedGenerator,
)


# Test prompts for generation
TEST_PROMPTS = [
    "The scientist discovered that",
    "In the year 2050,",
    "The secret to happiness is",
    "Once upon a time, there was",
    "The most important thing about",
    "When I opened the door,",
    "The future of technology",
    "She walked into the room and",
    "The ancient manuscript revealed",
    "After years of research,",
]


def greedy_generate(model, tokenizer, prompt: str, max_tokens: int = 50) -> str:
    """Baseline greedy generation."""
    input_ids = tokenizer.encode(prompt)
    input_tensor = mx.array([input_ids])

    generated = []

    for _ in range(max_tokens):
        result = model(input_tensor)

        if isinstance(result, tuple) and len(result) == 4:
            logits, _, _, _ = result
        else:
            output, _ = result
            logits = output.logits

        next_token = int(mx.argmax(logits[0, -1, :]).item())

        if next_token == tokenizer.eos_token_id:
            break

        generated.append(next_token)
        input_tensor = mx.concatenate(
            [input_tensor, mx.array([[next_token]])],
            axis=1,
        )

    return tokenizer.decode(generated)


def fixed_temp_generate(
    model, tokenizer, prompt: str, temperature: float, max_tokens: int = 50
) -> str:
    """Fixed temperature sampling."""
    input_ids = tokenizer.encode(prompt)
    input_tensor = mx.array([input_ids])

    generated = []

    for _ in range(max_tokens):
        result = model(input_tensor)

        if isinstance(result, tuple) and len(result) == 4:
            logits, _, _, _ = result
        else:
            output, _ = result
            logits = output.logits

        # Apply temperature
        scaled_logits = logits[0, -1, :] / temperature
        probs = mx.softmax(scaled_logits, axis=-1)

        # Sample
        cumsum = mx.cumsum(probs, axis=-1)
        u = mx.random.uniform(shape=(1,))
        next_token = int((cumsum < u).sum().item())
        next_token = min(next_token, probs.shape[-1] - 1)

        if next_token == tokenizer.eos_token_id:
            break

        generated.append(next_token)
        input_tensor = mx.concatenate(
            [input_tensor, mx.array([[next_token]])],
            axis=1,
        )

    return tokenizer.decode(generated)


def compute_diversity_metrics(tokens: List[int]) -> dict:
    """Compute diversity metrics for generated tokens."""
    if not tokens:
        return {"distinct_1": 0, "distinct_2": 0, "repetition_rate": 0}

    unigrams = tokens
    bigrams = list(zip(tokens[:-1], tokens[1:]))

    distinct_1 = len(set(unigrams)) / len(unigrams) if unigrams else 0
    distinct_2 = len(set(bigrams)) / len(bigrams) if bigrams else 0

    counts = Counter(tokens)
    repeated = sum(1 for c in counts.values() if c > 1)
    rep_rate = repeated / len(counts) if counts else 0

    return {
        "distinct_1": distinct_1,
        "distinct_2": distinct_2,
        "repetition_rate": rep_rate,
    }


def run_evaluation(checkpoint_path: str, max_tokens: int = 50):
    """Run full sampling strategy comparison."""
    print("=" * 70)
    print("PHASE 5: SAMPLING STRATEGY EVALUATION")
    print("=" * 70)

    # Load model
    print(f"\nLoading model from {checkpoint_path}...")
    checkpoint_dir = Path(checkpoint_path)

    with open(checkpoint_dir / "config.json") as f:
        config_data = json.load(f)

    model_config = get_config(config_data.get("model_config", "tiny"))
    weights = mx.load(str(checkpoint_dir / "model.safetensors"))

    # Detect model type
    is_phase4 = any("confidence_gate" in k for k in weights.keys())

    if is_phase4:
        print("  Detected Phase 4 model")
        model = LuminaPhase4Model(model_config, base_model=None)
    else:
        model = LuminaModel(model_config)

    model.load_weights(list(weights.items()), strict=False)

    # Load tokenizer
    tokenizer = load_tokenizer("gpt2")

    # Define strategies
    strategies = {
        "greedy": None,
        "temp_0.7": 0.7,
        "temp_1.0": 1.0,
        "temp_1.3": 1.3,
        "confidence_guided": SamplingConfig(
            min_temperature=0.3,
            max_temperature=1.5,
            min_top_p=0.7,
            max_top_p=0.95,
            repetition_penalty=1.2,
        ),
        "confidence_guided_aggressive": SamplingConfig(
            min_temperature=0.2,
            max_temperature=2.0,
            min_top_p=0.5,
            max_top_p=0.98,
            repetition_penalty=1.5,
        ),
    }

    results = {}

    for name, config in strategies.items():
        print(f"\n--- Strategy: {name} ---")

        all_tokens = []
        completions = []
        metadata_list = []

        for prompt in TEST_PROMPTS:
            if name == "greedy":
                text = greedy_generate(model, tokenizer, prompt, max_tokens)
            elif isinstance(config, float):
                # Fixed temperature
                text = fixed_temp_generate(model, tokenizer, prompt, config, max_tokens)
            elif isinstance(config, SamplingConfig):
                # Confidence-guided
                generator = ConfidenceGuidedGenerator(model, tokenizer, config)
                text, metadata = generator.generate(prompt, max_tokens=max_tokens)
                metadata_list.extend(metadata)
            else:
                continue

            completions.append(f"{prompt}{text}")
            tokens = tokenizer.encode(text)
            all_tokens.extend(tokens)

        # Compute metrics
        metrics = compute_diversity_metrics(all_tokens)

        # Add sampling stats for confidence-guided
        if metadata_list:
            metrics["avg_temperature"] = sum(m["temperature"] for m in metadata_list) / len(metadata_list)
            metrics["avg_top_p"] = sum(m["top_p"] for m in metadata_list) / len(metadata_list)
            metrics["avg_nucleus_size"] = sum(m["nucleus_size"] for m in metadata_list) / len(metadata_list)

        metrics["sample_completions"] = completions[:3]
        results[name] = metrics

        print(f"  Distinct-1: {metrics['distinct_1']:.4f}")
        print(f"  Distinct-2: {metrics['distinct_2']:.4f}")
        print(f"  Repetition: {metrics['repetition_rate']:.4f}")

    # Print comparison table
    print("\n" + "=" * 70)
    print("SAMPLING STRATEGY COMPARISON")
    print("=" * 70)
    print(f"{'Strategy':<30} {'Distinct-1':>12} {'Distinct-2':>12} {'Repetition':>12}")
    print("-" * 70)

    for name, metrics in results.items():
        print(f"{name:<30} {metrics['distinct_1']:>12.4f} {metrics['distinct_2']:>12.4f} {metrics['repetition_rate']:>12.4f}")

    # Find best strategy
    best_diverse = max(results.items(), key=lambda x: x[1]["distinct_2"])
    print(f"\nBest diversity: {best_diverse[0]} (distinct-2: {best_diverse[1]['distinct_2']:.4f})")

    # Print sample completions
    print("\n" + "=" * 70)
    print("SAMPLE COMPLETIONS")
    print("=" * 70)

    for name in ["greedy", "confidence_guided"]:
        if name in results:
            print(f"\n--- {name} ---")
            for i, completion in enumerate(results[name]["sample_completions"][:2]):
                print(f"  [{i+1}] {completion[:100]}...")

    return results


def main():
    parser = argparse.ArgumentParser(description="Evaluate sampling strategies")
    parser.add_argument(
        "--checkpoint",
        type=str,
        required=True,
        help="Path to model checkpoint",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=50,
        help="Max tokens to generate per prompt",
    )
    args = parser.parse_args()

    run_evaluation(args.checkpoint, args.max_tokens)


if __name__ == "__main__":
    main()
