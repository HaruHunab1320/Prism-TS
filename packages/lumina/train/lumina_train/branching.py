"""
Phase 3: Branching Computation

When the model is uncertain (high entropy), fork into multiple computation paths.
Each path explores a different high-probability continuation.

This is the key insight: instead of collapsing to a single token when uncertain,
we maintain multiple hypotheses and let confidence guide which ones survive.

Maps directly to Prism's `uncertain if` construct:
    uncertain if (condition ~> 0.6) {
        // high confidence path
    } ~| (condition ~> 0.4) {
        // alternative path
    }
"""

import math
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, NamedTuple
from enum import Enum

import mlx.core as mx
import mlx.nn as nn

from .model import LuminaModel, LuminaOutput, ConfidenceOutput


class BranchStatus(Enum):
    """Status of a computation branch."""
    ACTIVE = "active"       # Still being explored
    PRUNED = "pruned"       # Confidence too low, abandoned
    COMPLETED = "completed" # Reached end token or max length
    MERGED = "merged"       # Merged with another branch


@dataclass
class Branch:
    """A single computation branch."""

    # Unique identifier
    id: int

    # Parent branch (None for root)
    parent_id: Optional[int]

    # Token sequence for this branch
    tokens: List[int] = field(default_factory=list)

    # Confidence at each step
    confidences: List[float] = field(default_factory=list)

    # Entropy at each step
    entropies: List[float] = field(default_factory=list)

    # Cumulative log probability
    log_prob: float = 0.0

    # Current status
    status: BranchStatus = BranchStatus.ACTIVE

    # Fork point (step at which this branch diverged)
    fork_step: int = 0

    # The token that caused this branch to diverge
    divergence_token: Optional[int] = None

    @property
    def avg_confidence(self) -> float:
        """Average confidence across the branch."""
        if not self.confidences:
            return 1.0
        return sum(self.confidences) / len(self.confidences)

    @property
    def min_confidence(self) -> float:
        """Minimum confidence in the branch."""
        if not self.confidences:
            return 1.0
        return min(self.confidences)

    @property
    def length(self) -> int:
        """Number of tokens generated."""
        return len(self.tokens)

    def score(self, length_penalty: float = 0.6) -> float:
        """
        Compute branch score for ranking.

        Combines log probability with confidence and applies length normalization.
        """
        if self.length == 0:
            return float('-inf')

        # Length-normalized log prob
        length_norm = ((5 + self.length) / 6) ** length_penalty
        normalized_log_prob = self.log_prob / length_norm

        # Confidence bonus
        confidence_bonus = math.log(self.avg_confidence + 1e-10)

        return normalized_log_prob + 0.5 * confidence_bonus


@dataclass
class BranchingConfig:
    """Configuration for branching inference."""

    # Entropy threshold to trigger forking
    fork_entropy_threshold: float = 2.0

    # Minimum confidence to keep a branch alive
    min_branch_confidence: float = 0.1

    # Maximum number of active branches
    max_branches: int = 4

    # Number of tokens to consider when forking
    fork_top_k: int = 3

    # Maximum generation length per branch
    max_length: int = 100

    # Whether to allow re-forking (branches forking again)
    allow_recursive_fork: bool = True

    # Minimum steps between forks
    min_fork_interval: int = 3

    # Confidence threshold for early stopping
    high_confidence_threshold: float = 0.95

    # Temperature for sampling
    temperature: float = 1.0


class BranchResult(NamedTuple):
    """Result from branching inference."""

    # All branches (including pruned/completed)
    branches: List[Branch]

    # Best branch by score
    best_branch: Branch

    # All completed branches, ranked by score
    completed_branches: List[Branch]

    # Statistics
    total_forks: int
    total_pruned: int

    # Token distribution at each fork point
    fork_distributions: List[Dict[int, float]]


class BranchingInference:
    """
    Branching inference engine.

    When the model is uncertain, fork computation into multiple paths.
    Prune low-confidence paths. Return ranked completions.
    """

    def __init__(self, model: LuminaModel, config: BranchingConfig):
        self.model = model
        self.config = config
        self.branch_counter = 0

    def _create_branch(
        self,
        parent_id: Optional[int] = None,
        initial_tokens: Optional[List[int]] = None,
        fork_step: int = 0,
        divergence_token: Optional[int] = None,
    ) -> Branch:
        """Create a new branch."""
        self.branch_counter += 1
        return Branch(
            id=self.branch_counter,
            parent_id=parent_id,
            tokens=list(initial_tokens) if initial_tokens else [],
            fork_step=fork_step,
            divergence_token=divergence_token,
        )

    def _should_fork(
        self,
        entropy: float,
        confidence: float,
        step: int,
        last_fork_step: int,
        num_active_branches: int,
    ) -> bool:
        """Determine if we should fork at this step."""
        # Don't exceed max branches
        if num_active_branches >= self.config.max_branches:
            return False

        # Respect minimum fork interval
        if step - last_fork_step < self.config.min_fork_interval:
            return False

        # Fork if entropy is high enough
        if entropy > self.config.fork_entropy_threshold:
            return True

        # Also fork if confidence is very low (model is confused)
        if confidence < 0.3 and entropy > self.config.fork_entropy_threshold * 0.7:
            return True

        return False

    def _should_prune(self, branch: Branch) -> bool:
        """Determine if a branch should be pruned."""
        # Prune if confidence drops too low
        if branch.min_confidence < self.config.min_branch_confidence:
            return True

        # Prune if average confidence is very low
        if branch.avg_confidence < self.config.min_branch_confidence * 2:
            return True

        return False

    def _get_fork_tokens(
        self,
        logits: mx.array,
        current_token: int,
    ) -> List[Tuple[int, float]]:
        """Get tokens to fork on (excluding current choice)."""
        probs = mx.softmax(logits / self.config.temperature, axis=-1)

        # Get top-k indices using argsort (MLX topk returns values, not indices)
        sorted_indices = mx.argsort(-probs)  # Descending order
        top_indices = sorted_indices[:self.config.fork_top_k + 1]
        top_probs = probs[top_indices]

        fork_tokens = []
        for i in range(top_indices.shape[-1]):
            token = int(top_indices[i].item())
            prob = float(top_probs[i].item())

            # Skip the token we're already using
            if token != current_token and prob > 0.05:
                fork_tokens.append((token, prob))

        return fork_tokens[:self.config.fork_top_k - 1]  # Leave room for current

    def generate(
        self,
        input_ids: mx.array,
        max_new_tokens: Optional[int] = None,
        end_token_id: int = 50256,  # GPT-2 EOS
    ) -> BranchResult:
        """
        Generate with branching on uncertainty.

        Args:
            input_ids: [1, seq_len] input token IDs
            max_new_tokens: Maximum tokens to generate per branch
            end_token_id: Token ID that signals completion

        Returns:
            BranchResult with all branches and rankings
        """
        max_new_tokens = max_new_tokens or self.config.max_length

        # Initialize
        self.branch_counter = 0
        all_branches: List[Branch] = []
        active_branches: List[Tuple[Branch, mx.array]] = []  # (branch, current_ids)
        fork_distributions: List[Dict[int, float]] = []
        total_forks = 0
        total_pruned = 0

        # Create root branch
        root = self._create_branch()
        root.tokens = input_ids[0].tolist()
        active_branches.append((root, input_ids))

        # Track last fork step per branch
        last_fork_steps: Dict[int, int] = {root.id: -self.config.min_fork_interval}

        for step in range(max_new_tokens):
            if not active_branches:
                break

            next_active: List[Tuple[Branch, mx.array]] = []
            new_branches: List[Tuple[Branch, mx.array]] = []

            for branch, current_ids in active_branches:
                # Forward pass
                output, _ = self.model(current_ids)

                # Get last position predictions
                last_logits = output.logits[0, -1, :]  # [vocab_size]
                last_confidence = float(output.confidence.overall[0, -1].item())
                last_entropy = float(output.entropy[0, -1].item())

                # Sample next token
                probs = mx.softmax(last_logits / self.config.temperature, axis=-1)
                next_token = int(mx.argmax(probs).item())
                token_prob = float(probs[next_token].item())

                # Update branch
                branch.tokens.append(next_token)
                branch.confidences.append(last_confidence)
                branch.entropies.append(last_entropy)
                branch.log_prob += math.log(token_prob + 1e-10)

                # Check completion
                if next_token == end_token_id:
                    branch.status = BranchStatus.COMPLETED
                    all_branches.append(branch)
                    continue

                # Check pruning (never prune if this would leave us with no branches)
                is_only_branch = len(active_branches) == 1 and len(next_active) == 0
                if self._should_prune(branch) and not is_only_branch:
                    branch.status = BranchStatus.PRUNED
                    all_branches.append(branch)
                    total_pruned += 1
                    continue

                # Check for high confidence early stop
                if last_confidence > self.config.high_confidence_threshold:
                    # Very confident, no need to fork
                    new_ids = mx.concatenate([
                        current_ids,
                        mx.array([[next_token]])
                    ], axis=1)
                    next_active.append((branch, new_ids))
                    continue

                # Check if we should fork
                last_fork = last_fork_steps.get(branch.id, -self.config.min_fork_interval)
                num_active = len(active_branches) + len(new_branches)

                if self._should_fork(last_entropy, last_confidence, step, last_fork, num_active):
                    # Get alternative tokens
                    fork_tokens = self._get_fork_tokens(last_logits, next_token)

                    if fork_tokens:
                        total_forks += 1
                        last_fork_steps[branch.id] = step

                        # Record fork distribution
                        fork_dist = {next_token: token_prob}
                        for tok, prob in fork_tokens:
                            fork_dist[tok] = prob
                        fork_distributions.append(fork_dist)

                        # Create branches for alternatives
                        for alt_token, alt_prob in fork_tokens:
                            if num_active + len(new_branches) >= self.config.max_branches:
                                break

                            # Create new branch from parent state
                            new_branch = self._create_branch(
                                parent_id=branch.id,
                                initial_tokens=branch.tokens[:-1],  # Exclude last (we'll add alt)
                                fork_step=step,
                                divergence_token=alt_token,
                            )
                            new_branch.tokens.append(alt_token)
                            new_branch.confidences = branch.confidences[:-1] + [last_confidence]
                            new_branch.entropies = branch.entropies[:-1] + [last_entropy]
                            new_branch.log_prob = branch.log_prob - math.log(token_prob + 1e-10) + math.log(alt_prob + 1e-10)

                            last_fork_steps[new_branch.id] = step

                            # Create input IDs for new branch
                            new_ids = mx.array([new_branch.tokens])
                            new_branches.append((new_branch, new_ids))

                # Continue main branch
                new_ids = mx.concatenate([
                    current_ids,
                    mx.array([[next_token]])
                ], axis=1)
                next_active.append((branch, new_ids))

            # Combine active branches
            active_branches = next_active + new_branches

            # Prune excess branches by score
            if len(active_branches) > self.config.max_branches:
                active_branches.sort(key=lambda x: x[0].score(), reverse=True)

                for branch, _ in active_branches[self.config.max_branches:]:
                    branch.status = BranchStatus.PRUNED
                    all_branches.append(branch)
                    total_pruned += 1

                active_branches = active_branches[:self.config.max_branches]

        # Finalize remaining active branches
        for branch, _ in active_branches:
            if branch.status == BranchStatus.ACTIVE:
                branch.status = BranchStatus.COMPLETED
            all_branches.append(branch)

        # Sort completed branches by score
        completed = [b for b in all_branches if b.status == BranchStatus.COMPLETED]
        completed.sort(key=lambda b: b.score(), reverse=True)

        best = completed[0] if completed else all_branches[0]

        return BranchResult(
            branches=all_branches,
            best_branch=best,
            completed_branches=completed,
            total_forks=total_forks,
            total_pruned=total_pruned,
            fork_distributions=fork_distributions,
        )


class BeamWithConfidence:
    """
    Beam search augmented with confidence-based pruning.

    Standard beam search keeps top-k by probability.
    This version also considers confidence, pruning uncertain beams.
    """

    def __init__(
        self,
        model: LuminaModel,
        beam_width: int = 4,
        confidence_weight: float = 0.3,
        min_confidence: float = 0.2,
    ):
        self.model = model
        self.beam_width = beam_width
        self.confidence_weight = confidence_weight
        self.min_confidence = min_confidence

    def generate(
        self,
        input_ids: mx.array,
        max_new_tokens: int = 50,
        end_token_id: int = 50256,
    ) -> List[Tuple[List[int], float, float]]:
        """
        Generate with confidence-augmented beam search.

        Returns:
            List of (tokens, log_prob, avg_confidence) tuples
        """
        # Initialize beams: (tokens, log_prob, confidences)
        beams = [(input_ids[0].tolist(), 0.0, [])]
        completed = []

        for step in range(max_new_tokens):
            if not beams:
                break

            candidates = []

            for tokens, log_prob, confidences in beams:
                # Forward pass
                ids = mx.array([tokens])
                output, _ = self.model(ids)

                last_logits = output.logits[0, -1, :]
                last_confidence = float(output.confidence.overall[0, -1].item())

                # Skip if confidence too low
                if confidences and min(confidences) < self.min_confidence:
                    continue

                # Get top-k tokens using argsort
                probs = mx.softmax(last_logits, axis=-1)
                sorted_indices = mx.argsort(-probs)
                top_indices = sorted_indices[:self.beam_width * 2]
                top_probs = probs[top_indices]

                for i in range(top_indices.shape[-1]):
                    token = int(top_indices[i].item())
                    prob = float(top_probs[i].item())

                    new_tokens = tokens + [token]
                    new_log_prob = log_prob + math.log(prob + 1e-10)
                    new_confidences = confidences + [last_confidence]

                    # Score combines probability and confidence
                    avg_conf = sum(new_confidences) / len(new_confidences)
                    score = new_log_prob + self.confidence_weight * math.log(avg_conf + 1e-10)

                    if token == end_token_id:
                        completed.append((new_tokens, new_log_prob, avg_conf))
                    else:
                        candidates.append((new_tokens, new_log_prob, new_confidences, score))

            # Keep top beams
            candidates.sort(key=lambda x: x[3], reverse=True)
            beams = [(t, lp, c) for t, lp, c, _ in candidates[:self.beam_width]]

        # Add remaining beams to completed
        for tokens, log_prob, confidences in beams:
            avg_conf = sum(confidences) / len(confidences) if confidences else 1.0
            completed.append((tokens, log_prob, avg_conf))

        # Sort by score
        completed.sort(key=lambda x: x[1] + self.confidence_weight * math.log(x[2] + 1e-10), reverse=True)

        return completed


def visualize_branches(result: BranchResult, tokenizer) -> str:
    """Create a text visualization of the branch tree."""
    lines = []
    lines.append("=" * 60)
    lines.append("BRANCHING COMPUTATION RESULTS")
    lines.append("=" * 60)
    lines.append(f"Total forks: {result.total_forks}")
    lines.append(f"Total pruned: {result.total_pruned}")
    lines.append(f"Completed branches: {len(result.completed_branches)}")
    lines.append("")

    for i, branch in enumerate(result.completed_branches[:5]):
        lines.append(f"Branch {branch.id} (score: {branch.score():.3f})")
        lines.append(f"  Avg confidence: {branch.avg_confidence:.3f}")
        lines.append(f"  Min confidence: {branch.min_confidence:.3f}")
        lines.append(f"  Length: {branch.length}")

        # Decode tokens
        text = tokenizer.decode(branch.tokens)
        if len(text) > 100:
            text = text[:100] + "..."
        lines.append(f"  Text: {text}")
        lines.append("")

    lines.append("-" * 60)
    lines.append("BEST BRANCH:")
    best_text = tokenizer.decode(result.best_branch.tokens)
    lines.append(best_text)
    lines.append("=" * 60)

    return "\n".join(lines)


def demo_branching():
    """Demonstrate branching inference."""
    from .config import get_config
    from .data import load_tokenizer

    print("Loading model and tokenizer...")
    config = get_config("tiny")
    model = LuminaModel(config)
    tokenizer = load_tokenizer("gpt2")

    # Create branching config
    branch_config = BranchingConfig(
        fork_entropy_threshold=1.5,
        max_branches=4,
        fork_top_k=3,
        max_length=50,
    )

    brancher = BranchingInference(model, branch_config)

    # Test prompt
    prompt = "The future of artificial intelligence"
    input_ids = mx.array([tokenizer.encode(prompt)])

    print(f"\nPrompt: {prompt}")
    print("Generating with branching...")

    result = brancher.generate(input_ids, max_new_tokens=30)

    print(visualize_branches(result, tokenizer))


if __name__ == "__main__":
    demo_branching()
