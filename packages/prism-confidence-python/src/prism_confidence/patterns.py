"""
Advanced confidence patterns and utilities
"""

from typing import List, Dict, Any, Optional, Tuple, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import numpy as np
from collections import deque
import re

from .extractor import ConfidenceValue, ConfidenceResult


class ConfidenceBudgetManager:
    """Manages confidence budgets for decision making"""
    
    def __init__(self, min_total: float, max_items: Optional[int] = None):
        self.min_total = min_total
        self.max_items = max_items
        self.items: Dict[str, float] = {}
        self._values: Dict[str, float] = {}
    
    def add_item(self, name: str, confidence: float, value: Optional[float] = None):
        """Add an item with confidence"""
        self.items[name] = confidence
        if value is not None:
            self._values[name] = value
    
    def remove_item(self, name: str):
        """Remove an item"""
        self.items.pop(name, None)
        self._values.pop(name, None)
    
    def is_budget_met(self) -> bool:
        """Check if confidence budget is met"""
        total = sum(self.items.values())
        if self.max_items and len(self.items) > self.max_items:
            return False
        return total >= self.min_total
    
    def remaining_budget(self) -> float:
        """Get remaining budget needed"""
        total = sum(self.items.values())
        return max(0, self.min_total - total)
    
    def get_total_confidence(self) -> float:
        """Get total confidence"""
        return sum(self.items.values())
    
    def optimize_selection(self, available_items: List[Tuple[str, float, float]]) -> List[str]:
        """Select optimal items to meet budget (knapsack-like problem)"""
        # Simple greedy algorithm - sort by confidence/value ratio
        sorted_items = sorted(
            available_items,
            key=lambda x: x[1] / x[2] if x[2] > 0 else float('inf'),
            reverse=True
        )
        
        selected = []
        total_conf = 0.0
        
        for name, conf, value in sorted_items:
            if total_conf + conf <= self.min_total * 1.1:  # Allow 10% over
                selected.append(name)
                total_conf += conf
                if total_conf >= self.min_total:
                    break
        
        return selected


class ConfidenceContractManager:
    """Manages confidence contracts between components"""
    
    def __init__(self):
        self.contracts: Dict[str, 'ConfidenceContract'] = {}
    
    def add_contract(self, name: str, min_confidence: float, max_confidence: float = 1.0):
        """Add a confidence contract"""
        self.contracts[name] = ConfidenceContract(name, min_confidence, max_confidence)
    
    def check_contract(self, name: str, confidence: float) -> bool:
        """Check if confidence meets contract"""
        if name not in self.contracts:
            return True
        return self.contracts[name].is_satisfied(confidence)
    
    def validate_all(self, confidences: Dict[str, float]) -> Tuple[bool, List[str]]:
        """Validate all contracts, return (success, violations)"""
        violations = []
        for name, contract in self.contracts.items():
            if name in confidences:
                if not contract.is_satisfied(confidences[name]):
                    violations.append(name)
        return len(violations) == 0, violations


@dataclass
class ConfidenceContract:
    """Defines a confidence contract"""
    name: str
    min_confidence: float
    max_confidence: float = 1.0
    
    def is_satisfied(self, confidence: float) -> bool:
        """Check if confidence satisfies contract"""
        return self.min_confidence <= confidence <= self.max_confidence


class DifferentialConfidenceManager:
    """Manages differential confidence for privacy-aware systems"""
    
    def __init__(self, epsilon: float = 1.0):
        self.epsilon = epsilon  # Privacy parameter
        self._noise_scale = 1.0 / epsilon
    
    def add_noise(self, confidence: float, sensitivity: float = 0.1) -> float:
        """Add calibrated noise for differential privacy"""
        noise = np.random.laplace(0, self._noise_scale * sensitivity)
        noisy_confidence = confidence + noise
        return max(0.0, min(1.0, noisy_confidence))
    
    def aggregate_with_privacy(self, confidences: List[float], sensitivity: float = 0.1) -> float:
        """Aggregate confidences with privacy guarantees"""
        # Add noise to average
        avg = np.mean(confidences)
        return self.add_noise(avg, sensitivity / len(confidences))
    
    def get_privacy_adjusted_confidence(self, true_confidence: float, query_count: int) -> float:
        """Adjust confidence based on query count (privacy budget)"""
        # More queries = more noise
        adjusted_epsilon = self.epsilon / np.sqrt(query_count)
        noise_scale = 1.0 / adjusted_epsilon
        noise = np.random.laplace(0, noise_scale * 0.1)
        return max(0.0, min(1.0, true_confidence + noise))


class TemporalConfidence:
    """Tracks confidence over time"""
    
    def __init__(self, window_size: int = 100, time_window: Optional[timedelta] = None):
        self.window_size = window_size
        self.time_window = time_window
        self.history: deque = deque(maxlen=window_size)
        self._trend_window = min(20, window_size // 5)
    
    def add_observation(self, confidence: float, timestamp: Optional[datetime] = None):
        """Add a confidence observation"""
        if timestamp is None:
            timestamp = datetime.now()
        self.history.append((timestamp, confidence))
        
        # Remove old entries if using time window
        if self.time_window:
            cutoff = datetime.now() - self.time_window
            while self.history and self.history[0][0] < cutoff:
                self.history.popleft()
    
    def get_trend(self) -> str:
        """Get confidence trend (increasing/decreasing/stable)"""
        if len(self.history) < self._trend_window:
            return "insufficient_data"
        
        recent = list(self.history)[-self._trend_window:]
        confidences = [c for _, c in recent]
        
        # Simple linear regression
        x = np.arange(len(confidences))
        slope = np.polyfit(x, confidences, 1)[0]
        
        if abs(slope) < 0.001:
            return "stable"
        elif slope > 0:
            return "increasing"
        else:
            return "decreasing"
    
    def get_statistics(self) -> Dict[str, float]:
        """Get statistical summary"""
        if not self.history:
            return {"mean": 0.5, "std": 0.0, "min": 0.5, "max": 0.5}
        
        confidences = [c for _, c in self.history]
        return {
            "mean": np.mean(confidences),
            "std": np.std(confidences),
            "min": np.min(confidences),
            "max": np.max(confidences),
            "latest": confidences[-1]
        }
    
    def predict_next(self, steps: int = 1) -> float:
        """Simple prediction of next confidence value"""
        if len(self.history) < 2:
            return self.history[-1][1] if self.history else 0.5
        
        # Use recent trend for prediction
        recent = list(self.history)[-min(10, len(self.history)):]
        confidences = [c for _, c in recent]
        
        # Simple linear extrapolation
        x = np.arange(len(confidences))
        z = np.polyfit(x, confidences, 1)
        p = np.poly1d(z)
        
        predicted = p(len(confidences) + steps - 1)
        return max(0.0, min(1.0, predicted))


@dataclass
class ConfidenceThreshold:
    """Defines confidence thresholds for decisions"""
    critical: float = 0.95
    high: float = 0.85
    medium: float = 0.70
    low: float = 0.50
    
    def get_level(self, confidence: float) -> str:
        """Get confidence level"""
        if confidence >= self.critical:
            return "critical"
        elif confidence >= self.high:
            return "high"
        elif confidence >= self.medium:
            return "medium"
        elif confidence >= self.low:
            return "low"
        else:
            return "very_low"
    
    def meets_threshold(self, confidence: float, level: str) -> bool:
        """Check if confidence meets specified level"""
        thresholds = {
            "critical": self.critical,
            "high": self.high,
            "medium": self.medium,
            "low": self.low,
            "very_low": 0.0
        }
        return confidence >= thresholds.get(level, 0.0)


class ConfidenceGate:
    """Gate that requires minimum confidence to proceed"""
    
    def __init__(self, threshold: float = 0.7, 
                 fallback: Optional[Callable] = None,
                 require_all: bool = False):
        self.threshold = threshold
        self.fallback = fallback
        self.require_all = require_all
    
    def check(self, confidence: Union[float, ConfidenceValue, List[Union[float, ConfidenceValue]]]) -> bool:
        """Check if confidence passes gate"""
        if isinstance(confidence, list):
            confidences = [
                c.confidence if isinstance(c, ConfidenceValue) else c 
                for c in confidence
            ]
            if self.require_all:
                return all(c >= self.threshold for c in confidences)
            else:
                return any(c >= self.threshold for c in confidences)
        else:
            conf_value = confidence.confidence if isinstance(confidence, ConfidenceValue) else confidence
            return conf_value >= self.threshold
    
    def execute_with_fallback(self, confidence: Union[float, ConfidenceValue], 
                            primary: Callable, *args, **kwargs) -> Any:
        """Execute primary function or fallback based on confidence"""
        if self.check(confidence):
            return primary(*args, **kwargs)
        elif self.fallback:
            return self.fallback(*args, **kwargs)
        else:
            raise ValueError(f"Confidence {confidence} below threshold {self.threshold}")


class ConfidenceAggregator:
    """Aggregates confidence from multiple sources over time"""
    
    def __init__(self, decay_factor: float = 0.95):
        self.decay_factor = decay_factor
        self.sources: Dict[str, List[Tuple[datetime, float]]] = {}
    
    def add_observation(self, source: str, confidence: float, timestamp: Optional[datetime] = None):
        """Add confidence observation from a source"""
        if timestamp is None:
            timestamp = datetime.now()
        
        if source not in self.sources:
            self.sources[source] = []
        
        self.sources[source].append((timestamp, confidence))
    
    def get_weighted_confidence(self, max_age: Optional[timedelta] = None) -> float:
        """Get time-weighted confidence across all sources"""
        if not self.sources:
            return 0.5
        
        now = datetime.now()
        weighted_sum = 0.0
        weight_sum = 0.0
        
        for source, observations in self.sources.items():
            if not observations:
                continue
                
            # Get latest observation from this source
            latest_time, latest_conf = max(observations, key=lambda x: x[0])
            
            # Skip if too old
            if max_age and (now - latest_time) > max_age:
                continue
            
            # Calculate time-based weight
            age_hours = (now - latest_time).total_seconds() / 3600
            weight = self.decay_factor ** age_hours
            
            weighted_sum += latest_conf * weight
            weight_sum += weight
        
        return weighted_sum / weight_sum if weight_sum > 0 else 0.5


# Pattern matching functionality (from original file)
@dataclass
class Pattern:
    """Represents a confidence extraction pattern"""
    name: str
    regex: re.Pattern
    transformer: Callable[[re.Match], float]
    
    def match(self, text: str) -> Optional[ConfidenceValue]:
        """
        Attempt to match the pattern against text
        
        Args:
            text: The text to match against
            
        Returns:
            ConfidenceValue if match found, None otherwise
        """
        match = self.regex.search(text)
        if match:
            try:
                confidence = self.transformer(match)
                return ConfidenceValue(value=match.group(0), confidence=confidence)
            except Exception:
                return None
        return None


class PatternMatcher:
    """Manages pattern-based confidence extraction"""
    
    def __init__(self):
        """Initialize the pattern matcher"""
        self.patterns: List[Pattern] = []
        self._init_default_patterns()
    
    def _init_default_patterns(self):
        """Initialize default confidence patterns"""
        # Percentage pattern: "90% confident", "85% sure", etc.
        self.add_pattern(
            name="percentage",
            regex=r"(\d+(?:\.\d+)?)\s*%\s*(?:confident|sure|certain)",
            transformer=lambda m: float(m.group(1)) / 100
        )
        
        # Decimal pattern: "0.95 confidence", "confidence: 0.8", etc.
        self.add_pattern(
            name="decimal",
            regex=r"(?:confidence|certainty)[\s:]+([01]\.?\d*)",
            transformer=lambda m: float(m.group(1))
        )
        
        # Word pattern: "highly confident", "somewhat sure", etc.
        word_mappings = {
            "very low": 0.1,
            "low": 0.3,
            "somewhat": 0.5,
            "moderate": 0.6,
            "high": 0.8,
            "very high": 0.95,
            "extremely": 0.99
        }
        self.add_pattern(
            name="words",
            regex=r"(very low|low|somewhat|moderate|high|very high|extremely)\s+(?:confident|sure|certain)",
            transformer=lambda m: word_mappings.get(m.group(1), 0.5)
        )
    
    def add_pattern(self, name: str, regex: str, transformer: Callable[[re.Match], float]):
        """
        Add a new pattern to the matcher
        
        Args:
            name: Name of the pattern
            regex: Regular expression pattern
            transformer: Function to transform match to confidence value
        """
        pattern = Pattern(
            name=name,
            regex=re.compile(regex, re.IGNORECASE),
            transformer=transformer
        )
        self.patterns.append(pattern)
    
    def match(self, text: str) -> Optional[ConfidenceValue]:
        """
        Match text against all patterns
        
        Args:
            text: The text to analyze
            
        Returns:
            First matching ConfidenceValue, or None if no match
        """
        for pattern in self.patterns:
            result = pattern.match(text)
            if result:
                return result
        return None
    
    def match_all(self, text: str) -> List[ConfidenceValue]:
        """
        Find all matching patterns in text
        
        Args:
            text: The text to analyze
            
        Returns:
            List of all matching ConfidenceValues
        """
        results = []
        for pattern in self.patterns:
            result = pattern.match(text)
            if result:
                results.append(result)
        return results