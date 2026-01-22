"""
Phase 5: Confidence-Guided Sampling

Use the model's calibrated confidence scores to dynamically adjust
sampling parameters during generation.

Key insight: A well-calibrated model knows when it's uncertain.
We can use this to:
- Be more deterministic when confident (low temperature)
- Explore more when uncertain (high temperature, wider nucleus)

This directly supports Prism's uncertainty paradigm - the sampling
strategy respects the model's own uncertainty estimates.
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple
import mlx.core as mx
import mlx.nn as nn


@dataclass
class SamplingConfig:
    """Configuration for confidence-guided sampling."""

    # Temperature bounds
    min_temperature: float = 0.3  # When highly confident
    max_temperature: float = 1.5  # When very uncertain

    # Nucleus (top-p) bounds
    min_top_p: float = 0.7  # Tight nucleus when confident
    max_top_p: float = 0.95  # Wide nucleus when uncertain

    # Confidence thresholds
    high_confidence: float = 0.8  # Above this = confident
    low_confidence: float = 0.4  # Below this = uncertain

    # Entropy-based adjustments
    use_entropy: bool = True  # Also consider entropy
    entropy_scale: float = 0.5  # How much entropy affects sampling

    # Repetition penalty
    repetition_penalty: float = 1.2
    repetition_window: int = 32


class ConfidenceGuidedSampler:
    """
    Samples tokens using confidence-adaptive temperature and nucleus.

    When the model is confident, we trust its top predictions.
    When uncertain, we explore the distribution more broadly.
    """

    def __init__(self, config: SamplingConfig = None):
        self.config = config or SamplingConfig()

    def compute_temperature(
        self,
        confidence: float,
        entropy: Optional[float] = None,
    ) -> float:
        """
        Compute temperature based on confidence (and optionally entropy).

        High confidence → low temperature (deterministic)
        Low confidence → high temperature (exploratory)
        """
        cfg = self.config

        # Linear interpolation based on confidence
        # Clamp confidence to [low, high] range
        conf_clamped = max(cfg.low_confidence, min(cfg.high_confidence, confidence))

        # Normalize to [0, 1]
        conf_norm = (conf_clamped - cfg.low_confidence) / (
            cfg.high_confidence - cfg.low_confidence + 1e-8
        )

        # Interpolate: high confidence = low temp, low confidence = high temp
        temperature = cfg.max_temperature - conf_norm * (
            cfg.max_temperature - cfg.min_temperature
        )

        # Adjust for entropy if enabled
        if self.config.use_entropy and entropy is not None:
            # High entropy = more uncertainty = higher temperature
            # Typical entropy range is 0-10, normalize roughly
            entropy_factor = min(entropy / 5.0, 1.0) * cfg.entropy_scale
            temperature = temperature * (1.0 + entropy_factor)

        return max(cfg.min_temperature, min(cfg.max_temperature, temperature))

    def compute_top_p(
        self,
        confidence: float,
        entropy: Optional[float] = None,
    ) -> float:
        """
        Compute nucleus size (top-p) based on confidence.

        High confidence → tight nucleus (few tokens)
        Low confidence → wide nucleus (many tokens)
        """
        cfg = self.config

        # Linear interpolation
        conf_clamped = max(cfg.low_confidence, min(cfg.high_confidence, confidence))
        conf_norm = (conf_clamped - cfg.low_confidence) / (
            cfg.high_confidence - cfg.low_confidence + 1e-8
        )

        # High confidence = low top_p (tight), low confidence = high top_p (wide)
        top_p = cfg.max_top_p - conf_norm * (cfg.max_top_p - cfg.min_top_p)

        return top_p

    def apply_repetition_penalty(
        self,
        logits: mx.array,
        generated_tokens: List[int],
    ) -> mx.array:
        """Apply repetition penalty to recently generated tokens."""
        if not generated_tokens or self.config.repetition_penalty == 1.0:
            return logits

        # Get recent tokens within window
        recent = generated_tokens[-self.config.repetition_window:]

        # Create penalty mask
        logits_np = logits.tolist()
        for token_id in set(recent):
            if token_id < len(logits_np):
                # Reduce probability of repeated tokens
                if logits_np[token_id] > 0:
                    logits_np[token_id] = logits_np[token_id] / self.config.repetition_penalty
                else:
                    logits_np[token_id] = logits_np[token_id] * self.config.repetition_penalty

        return mx.array(logits_np)

    def sample(
        self,
        logits: mx.array,
        confidence: float,
        entropy: Optional[float] = None,
        generated_tokens: Optional[List[int]] = None,
    ) -> Tuple[int, dict]:
        """
        Sample a token using confidence-guided parameters.

        Args:
            logits: [vocab_size] logits for next token
            confidence: Model's confidence score (0-1)
            entropy: Optional entropy of distribution
            generated_tokens: Previously generated tokens (for repetition penalty)

        Returns:
            (token_id, metadata_dict)
        """
        # Compute adaptive parameters
        temperature = self.compute_temperature(confidence, entropy)
        top_p = self.compute_top_p(confidence, entropy)

        # Apply repetition penalty
        if generated_tokens:
            logits = self.apply_repetition_penalty(logits, generated_tokens)

        # Apply temperature
        scaled_logits = logits / temperature

        # Compute probabilities
        probs = mx.softmax(scaled_logits, axis=-1)

        # Apply nucleus (top-p) sampling
        sorted_indices = mx.argsort(-probs)
        sorted_probs = probs[sorted_indices]

        # Compute cumulative probabilities
        cumsum = mx.cumsum(sorted_probs, axis=-1)

        # Find cutoff index where cumsum exceeds top_p
        # Include at least one token
        mask = cumsum <= top_p
        # Shift mask to include the first token that exceeds threshold
        mask = mx.concatenate([mx.array([True]), mask[:-1]])

        # Zero out tokens outside nucleus
        nucleus_probs = mx.where(mask, sorted_probs, mx.zeros_like(sorted_probs))

        # Renormalize
        nucleus_probs = nucleus_probs / (nucleus_probs.sum() + 1e-10)

        # Sample from nucleus
        # Use categorical sampling
        cumsum_nucleus = mx.cumsum(nucleus_probs, axis=-1)
        u = mx.random.uniform(shape=(1,))
        sample_idx = int((cumsum_nucleus < u).sum().item())
        sample_idx = min(sample_idx, len(sorted_indices) - 1)

        token_id = int(sorted_indices[sample_idx].item())

        metadata = {
            "temperature": temperature,
            "top_p": top_p,
            "confidence": confidence,
            "entropy": entropy,
            "nucleus_size": int(mask.sum().item()),
            "token_prob": float(probs[token_id].item()),
        }

        return token_id, metadata


class ConfidenceGuidedGenerator:
    """
    Full text generation with confidence-guided sampling.
    """

    def __init__(
        self,
        model,
        tokenizer,
        sampling_config: SamplingConfig = None,
    ):
        self.model = model
        self.tokenizer = tokenizer
        self.sampler = ConfidenceGuidedSampler(sampling_config)

    def generate(
        self,
        prompt: str,
        max_tokens: int = 100,
        stop_tokens: Optional[List[int]] = None,
    ) -> Tuple[str, List[dict]]:
        """
        Generate text with confidence-guided sampling.

        Returns:
            (generated_text, list_of_token_metadata)
        """
        # Encode prompt
        input_ids = self.tokenizer.encode(prompt)
        input_tensor = mx.array([input_ids])

        generated_tokens = []
        token_metadata = []

        # Get stop tokens
        if stop_tokens is None:
            stop_tokens = [self.tokenizer.eos_token_id]

        for _ in range(max_tokens):
            # Forward pass
            result = self.model(input_tensor)

            # Handle different model output formats
            if isinstance(result, tuple) and len(result) == 4:
                # Phase 4 model: (logits, entropy, confidence, layer_confidences)
                logits, entropy, confidence, _ = result
                conf_score = float(confidence.overall[0, -1].item())
                ent_score = float(entropy[0, -1].item())
            else:
                # Base model: (LuminaOutput, cache)
                output, _ = result
                logits = output.logits
                conf_score = float(output.confidence.overall[0, -1].item())
                ent_score = float(output.entropy[0, -1].item())

            # Get logits for last position
            next_logits = logits[0, -1, :]

            # Sample with confidence guidance
            token_id, metadata = self.sampler.sample(
                next_logits,
                confidence=conf_score,
                entropy=ent_score,
                generated_tokens=generated_tokens,
            )

            # Check for stop token
            if token_id in stop_tokens:
                break

            # Append to sequence
            generated_tokens.append(token_id)
            token_metadata.append(metadata)

            # Update input for next iteration
            input_tensor = mx.concatenate(
                [input_tensor, mx.array([[token_id]])],
                axis=1,
            )

        # Decode generated tokens
        generated_text = self.tokenizer.decode(generated_tokens)

        return generated_text, token_metadata


def evaluate_sampling_strategies(
    model,
    tokenizer,
    prompts: List[str],
    strategies: dict,
) -> dict:
    """
    Compare different sampling strategies.

    Args:
        model: Lumina model
        tokenizer: Tokenizer
        prompts: List of prompts to test
        strategies: Dict of strategy_name -> SamplingConfig

    Returns:
        Dict with metrics for each strategy
    """
    from collections import Counter

    results = {}

    for name, config in strategies.items():
        print(f"\nEvaluating strategy: {name}")

        generator = ConfidenceGuidedGenerator(model, tokenizer, config)

        all_tokens = []
        all_metadata = []
        completions = []

        for prompt in prompts:
            text, metadata = generator.generate(prompt, max_tokens=50)
            completions.append(text)
            all_metadata.extend(metadata)

            # Tokenize for diversity metrics
            tokens = tokenizer.encode(text)
            all_tokens.extend(tokens)

        # Compute metrics
        if all_tokens:
            # Distinct-n
            unigrams = all_tokens
            bigrams = list(zip(all_tokens[:-1], all_tokens[1:]))

            distinct_1 = len(set(unigrams)) / len(unigrams) if unigrams else 0
            distinct_2 = len(set(bigrams)) / len(bigrams) if bigrams else 0

            # Average temperature/top_p used
            avg_temp = sum(m["temperature"] for m in all_metadata) / len(all_metadata)
            avg_top_p = sum(m["top_p"] for m in all_metadata) / len(all_metadata)
            avg_nucleus = sum(m["nucleus_size"] for m in all_metadata) / len(all_metadata)

            # Repetition rate
            token_counts = Counter(all_tokens)
            repeated = sum(1 for c in token_counts.values() if c > 1)
            rep_rate = repeated / len(token_counts) if token_counts else 0

            results[name] = {
                "distinct_1": distinct_1,
                "distinct_2": distinct_2,
                "avg_temperature": avg_temp,
                "avg_top_p": avg_top_p,
                "avg_nucleus_size": avg_nucleus,
                "repetition_rate": rep_rate,
                "sample_completions": completions[:3],
            }

    return results
