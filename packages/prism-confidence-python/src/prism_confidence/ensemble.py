"""
Ensemble methods for combining confidence values
"""

from enum import Enum
from typing import List, Dict, Any, Optional, Union
import numpy as np
from dataclasses import dataclass
from abc import ABC, abstractmethod

from .extractor import ConfidenceValue


class EnsembleMethod(Enum):
    """Available ensemble methods"""
    MEAN = "mean"
    WEIGHTED_MEAN = "weighted_mean"
    MEDIAN = "median"
    MAX = "max"
    MIN = "min"
    HARMONIC_MEAN = "harmonic_mean"


def ensemble_combine(
    values: List[ConfidenceValue],
    method: EnsembleMethod = EnsembleMethod.MEAN,
    weights: List[float] = None
) -> ConfidenceValue:
    """
    Combine multiple confidence values using ensemble methods
    
    Args:
        values: List of ConfidenceValue objects to combine
        method: The ensemble method to use
        weights: Optional weights for weighted methods
        
    Returns:
        Combined ConfidenceValue
    """
    if not values:
        raise ValueError("Cannot combine empty list of values")
    
    confidences = [v.confidence for v in values]
    
    if method == EnsembleMethod.MEAN:
        combined_confidence = np.mean(confidences)
    elif method == EnsembleMethod.WEIGHTED_MEAN:
        if weights is None:
            weights = [1.0] * len(confidences)
        if len(weights) != len(confidences):
            raise ValueError("Weights must have same length as values")
        combined_confidence = np.average(confidences, weights=weights)
    elif method == EnsembleMethod.MEDIAN:
        combined_confidence = np.median(confidences)
    elif method == EnsembleMethod.MAX:
        combined_confidence = np.max(confidences)
    elif method == EnsembleMethod.MIN:
        combined_confidence = np.min(confidences)
    elif method == EnsembleMethod.HARMONIC_MEAN:
        # Avoid division by zero
        non_zero = [c for c in confidences if c > 0]
        if not non_zero:
            combined_confidence = 0.0
        else:
            combined_confidence = len(non_zero) / sum(1/c for c in non_zero)
    else:
        raise ValueError(f"Unknown ensemble method: {method}")
    
    # For the combined value, we'll use a dictionary representation
    combined_value = {
        "ensemble_method": method.value,
        "num_sources": len(values),
        "source_values": [v.value for v in values]
    }
    
    return ConfidenceValue(value=combined_value, confidence=combined_confidence)


class BaseEnsemble(ABC):
    """Base class for ensemble methods"""
    
    @abstractmethod
    def combine(self, sources: Dict[str, ConfidenceValue], **kwargs) -> ConfidenceValue:
        """Combine confidence values from multiple sources"""
        pass


class ConfidenceEnsemble(BaseEnsemble):
    """Standard ensemble for combining confidence values"""
    
    def combine(self, sources: Dict[str, ConfidenceValue], method: str = "average", 
                weights: Optional[Dict[str, float]] = None, **kwargs) -> ConfidenceValue:
        """Combine confidence values using specified method"""
        if not sources:
            raise ValueError("No sources provided")
        
        values = list(sources.values())
        
        if method == "average":
            confidence = np.mean([v.confidence for v in values])
        elif method == "weighted":
            if not weights:
                raise ValueError("Weights required for weighted method")
            
            # Normalize weights
            total_weight = sum(weights.values())
            confidence = sum(
                sources[name].confidence * weights.get(name, 0) / total_weight
                for name in sources
            )
        elif method == "max":
            confidence = max(v.confidence for v in values)
        elif method == "min":
            confidence = min(v.confidence for v in values)
        elif method == "median":
            confidence = np.median([v.confidence for v in values])
        else:
            raise ValueError(f"Unknown method: {method}")
        
        # Combined value includes source information
        combined_value = {
            "method": method,
            "sources": {name: v.value for name, v in sources.items()},
            "weights": weights
        }
        
        return ConfidenceValue(value=combined_value, confidence=confidence)


class WeightedEnsemble(BaseEnsemble):
    """Ensemble that uses predefined weights"""
    
    def __init__(self, weights: Dict[str, float]):
        self.weights = weights
        self.total_weight = sum(weights.values())
    
    def combine(self, sources: Dict[str, ConfidenceValue], **kwargs) -> ConfidenceValue:
        """Combine using predefined weights"""
        confidence = sum(
            sources[name].confidence * self.weights.get(name, 0) / self.total_weight
            for name in sources
            if name in self.weights
        )
        
        combined_value = {
            "method": "weighted",
            "sources": {name: v.value for name, v in sources.items()},
            "weights": self.weights
        }
        
        return ConfidenceValue(value=combined_value, confidence=confidence)


class VotingEnsemble(BaseEnsemble):
    """Ensemble that uses voting mechanisms"""
    
    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold
    
    def combine(self, sources: Dict[str, ConfidenceValue], voting: str = "soft", **kwargs) -> ConfidenceValue:
        """Combine using voting"""
        values = list(sources.values())
        
        if voting == "hard":
            # Count how many sources have confidence above threshold
            votes = sum(1 for v in values if v.confidence >= self.threshold)
            confidence = votes / len(values)
        elif voting == "soft":
            # Average confidence weighted by whether it's above threshold
            confidence = np.mean([v.confidence for v in values])
        else:
            raise ValueError(f"Unknown voting method: {voting}")
        
        combined_value = {
            "method": f"{voting}_voting",
            "sources": {name: v.value for name, v in sources.items()},
            "threshold": self.threshold
        }
        
        return ConfidenceValue(value=combined_value, confidence=confidence)


class BayesianEnsemble(BaseEnsemble):
    """Ensemble using Bayesian combination"""
    
    def __init__(self, priors: Optional[Dict[str, float]] = None):
        self.priors = priors or {}
    
    def combine(self, sources: Dict[str, ConfidenceValue], **kwargs) -> ConfidenceValue:
        """Combine using Bayesian updating"""
        # Simple Bayesian combination using log-odds
        log_odds_sum = 0.0
        
        for name, cv in sources.items():
            prior = self.priors.get(name, 0.5)
            # Convert confidence to log-odds
            if cv.confidence > 0 and cv.confidence < 1:
                log_odds = np.log(cv.confidence / (1 - cv.confidence))
                prior_log_odds = np.log(prior / (1 - prior)) if 0 < prior < 1 else 0
                log_odds_sum += log_odds - prior_log_odds
        
        # Convert back to probability
        if log_odds_sum > 100:  # Prevent overflow
            confidence = 1.0
        elif log_odds_sum < -100:
            confidence = 0.0
        else:
            odds = np.exp(log_odds_sum)
            confidence = odds / (1 + odds)
        
        combined_value = {
            "method": "bayesian",
            "sources": {name: v.value for name, v in sources.items()},
            "priors": self.priors
        }
        
        return ConfidenceValue(value=combined_value, confidence=confidence)


@dataclass
class EnsembleConfig:
    """Configuration for ensemble methods"""
    method: str = "average"
    weights: Optional[Dict[str, float]] = None
    threshold: float = 0.5
    priors: Optional[Dict[str, float]] = None


def create_ensemble(config: EnsembleConfig) -> BaseEnsemble:
    """Factory function to create ensemble from config"""
    if config.method == "weighted" and config.weights:
        return WeightedEnsemble(config.weights)
    elif config.method in ["hard_voting", "soft_voting"]:
        return VotingEnsemble(config.threshold)
    elif config.method == "bayesian" and config.priors:
        return BayesianEnsemble(config.priors)
    else:
        return ConfidenceEnsemble()