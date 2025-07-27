"""
Tests for ensemble confidence methods
"""

import pytest
import numpy as np
from prism_confidence.ensemble import (
    ConfidenceEnsemble,
    WeightedEnsemble,
    VotingEnsemble,
    BayesianEnsemble,
)
from prism_confidence import ConfidenceValue


class TestConfidenceEnsemble:
    """Test base ensemble functionality"""

    def test_weighted_average(self):
        """Test weighted average combination"""
        ensemble = ConfidenceEnsemble()

        sources = {
            "llm": ConfidenceValue("result", 0.8),
            "rule_based": ConfidenceValue("result", 0.6),
            "heuristic": ConfidenceValue("result", 0.7),
        }

        weights = {"llm": 0.5, "rule_based": 0.3, "heuristic": 0.2}

        result = ensemble.combine(sources, method="weighted", weights=weights)

        # Weighted average: 0.8*0.5 + 0.6*0.3 + 0.7*0.2 = 0.72
        assert abs(result.confidence - 0.72) < 0.001

    def test_simple_average(self):
        """Test simple average combination"""
        ensemble = ConfidenceEnsemble()

        sources = {
            "source1": ConfidenceValue("result", 0.8),
            "source2": ConfidenceValue("result", 0.6),
            "source3": ConfidenceValue("result", 0.7),
        }

        result = ensemble.combine(sources, method="average")

        # Simple average: (0.8 + 0.6 + 0.7) / 3 = 0.7
        assert abs(result.confidence - 0.7) < 0.001

    def test_minimum_confidence(self):
        """Test minimum confidence selection"""
        ensemble = ConfidenceEnsemble()

        sources = {
            "optimistic": ConfidenceValue("result", 0.9),
            "conservative": ConfidenceValue("result", 0.5),
            "moderate": ConfidenceValue("result", 0.7),
        }

        result = ensemble.combine(sources, method="minimum")
        assert result.confidence == 0.5

    def test_maximum_confidence(self):
        """Test maximum confidence selection"""
        ensemble = ConfidenceEnsemble()

        sources = {
            "source1": ConfidenceValue("result", 0.6),
            "source2": ConfidenceValue("result", 0.9),
            "source3": ConfidenceValue("result", 0.7),
        }

        result = ensemble.combine(sources, method="maximum")
        assert result.confidence == 0.9

    def test_median_confidence(self):
        """Test median confidence selection"""
        ensemble = ConfidenceEnsemble()

        sources = {
            "low": ConfidenceValue("result", 0.3),
            "medium": ConfidenceValue("result", 0.6),
            "high": ConfidenceValue("result", 0.9),
            "outlier": ConfidenceValue("result", 0.1),
        }

        result = ensemble.combine(sources, method="median")
        # Median of [0.1, 0.3, 0.6, 0.9] is (0.3 + 0.6) / 2 = 0.45
        assert abs(result.confidence - 0.45) < 0.001


class TestWeightedEnsemble:
    """Test weighted ensemble with adaptive weights"""

    def test_adaptive_weights(self):
        """Test adaptive weight adjustment based on performance"""
        ensemble = WeightedEnsemble(adaptive=True)

        # Initial combination
        sources = {
            "accurate": ConfidenceValue("A", 0.8),
            "inaccurate": ConfidenceValue("A", 0.9),
        }

        result = ensemble.combine(sources)
        initial_confidence = result.confidence

        # Provide feedback that "accurate" was correct
        ensemble.update_weights("accurate", correct=True)
        ensemble.update_weights("inaccurate", correct=False)

        # Recombine - should favor "accurate" source
        result = ensemble.combine(sources)
        assert result.confidence < initial_confidence  # Lower due to inaccurate's high value

    def test_weight_normalization(self):
        """Test that weights are properly normalized"""
        weights = {"source1": 10, "source2": 20, "source3": 30}
        ensemble = WeightedEnsemble(initial_weights=weights)

        sources = {
            "source1": ConfidenceValue("result", 1.0),
            "source2": ConfidenceValue("result", 1.0),
            "source3": ConfidenceValue("result", 1.0),
        }

        result = ensemble.combine(sources)
        assert abs(result.confidence - 1.0) < 0.001  # All 1.0 should still be 1.0


class TestVotingEnsemble:
    """Test voting-based ensemble methods"""

    def test_majority_voting(self):
        """Test majority voting combination"""
        ensemble = VotingEnsemble(threshold=0.7)

        # 3 high confidence, 2 low confidence
        sources = {
            "voter1": ConfidenceValue("A", 0.8),
            "voter2": ConfidenceValue("A", 0.85),
            "voter3": ConfidenceValue("A", 0.9),
            "voter4": ConfidenceValue("A", 0.4),
            "voter5": ConfidenceValue("A", 0.3),
        }

        result = ensemble.combine(sources, voting_method="majority")

        # 3/5 = 60% voted high confidence
        # Confidence should be weighted by vote proportion
        assert result.confidence > 0.6

    def test_unanimous_voting(self):
        """Test unanimous voting requirement"""
        ensemble = VotingEnsemble(threshold=0.7)

        # All high confidence
        sources = {
            f"voter{i}": ConfidenceValue("A", 0.8 + i * 0.02)
            for i in range(5)
        }

        result = ensemble.combine(sources, voting_method="unanimous")
        assert result.confidence > 0.7  # All voted high

        # Add one low confidence voter
        sources["dissenter"] = ConfidenceValue("A", 0.3)
        result = ensemble.combine(sources, voting_method="unanimous")
        assert result.confidence < 0.5  # Not unanimous


class TestBayesianEnsemble:
    """Test Bayesian ensemble combination"""

    def test_bayesian_update(self):
        """Test Bayesian confidence updates"""
        # Prior probabilities for each source being reliable
        priors = {
            "expert": 0.8,
            "novice": 0.3,
            "random": 0.5,
        }

        ensemble = BayesianEnsemble(priors=priors)

        sources = {
            "expert": ConfidenceValue("A", 0.9),
            "novice": ConfidenceValue("A", 0.6),
            "random": ConfidenceValue("A", 0.5),
        }

        result = ensemble.combine(sources)

        # Should weight expert opinion more heavily
        assert result.confidence > 0.7

    def test_evidence_accumulation(self):
        """Test evidence accumulation over multiple observations"""
        ensemble = BayesianEnsemble()

        # First observation
        sources1 = {
            "sensor1": ConfidenceValue("detected", 0.7),
            "sensor2": ConfidenceValue("detected", 0.8),
        }
        result1 = ensemble.combine(sources1)

        # Second observation (same sensors, consistent readings)
        sources2 = {
            "sensor1": ConfidenceValue("detected", 0.75),
            "sensor2": ConfidenceValue("detected", 0.85),
        }
        result2 = ensemble.combine(sources2, update_priors=True)

        # Confidence should increase with consistent evidence
        assert result2.confidence > result1.confidence


class TestEnsembleEdgeCases:
    """Test edge cases and error handling"""

    def test_empty_sources(self):
        """Test handling of empty source dict"""
        ensemble = ConfidenceEnsemble()

        with pytest.raises(ValueError, match="No sources provided"):
            ensemble.combine({})

    def test_single_source(self):
        """Test handling of single source"""
        ensemble = ConfidenceEnsemble()

        sources = {"only": ConfidenceValue("result", 0.75)}
        result = ensemble.combine(sources)

        assert result.confidence == 0.75

    def test_mismatched_weights(self):
        """Test handling of mismatched weights"""
        ensemble = ConfidenceEnsemble()

        sources = {
            "source1": ConfidenceValue("result", 0.8),
            "source2": ConfidenceValue("result", 0.6),
        }

        # Weights don't match sources
        weights = {"source1": 0.7, "source3": 0.3}

        with pytest.raises(ValueError, match="Weight keys don't match"):
            ensemble.combine(sources, method="weighted", weights=weights)

    def test_invalid_method(self):
        """Test handling of invalid combination method"""
        ensemble = ConfidenceEnsemble()

        sources = {"source": ConfidenceValue("result", 0.5)}

        with pytest.raises(ValueError, match="Unknown method"):
            ensemble.combine(sources, method="invalid_method")


class TestEnsembleWithDifferentValueTypes:
    """Test ensemble handling of different value types"""

    def test_different_value_types(self):
        """Test combining different types of values"""
        ensemble = ConfidenceEnsemble()

        sources = {
            "numeric": ConfidenceValue(42, 0.8),
            "string": ConfidenceValue("42", 0.7),
            "boolean": ConfidenceValue(True, 0.9),
        }

        # Should still combine confidences even with different value types
        result = ensemble.combine(sources, method="average")
        assert abs(result.confidence - 0.8) < 0.001

    def test_value_agreement_bonus(self):
        """Test bonus confidence for agreeing values"""
        ensemble = ConfidenceEnsemble(agreement_bonus=0.1)

        # All sources agree on value
        sources = {
            "source1": ConfidenceValue("same_answer", 0.6),
            "source2": ConfidenceValue("same_answer", 0.7),
            "source3": ConfidenceValue("same_answer", 0.65),
        }

        result = ensemble.combine(sources)
        base_confidence = (0.6 + 0.7 + 0.65) / 3

        # Should get agreement bonus
        assert result.confidence > base_confidence
        assert result.confidence <= min(1.0, base_confidence + 0.1)