"""
Calibration module for confidence values
"""

import math
import numpy as np
from typing import Dict, Any, Optional, List, Tuple, Callable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from abc import ABC, abstractmethod

from .extractor import ConfidenceValue


@dataclass
class CalibrationCurve:
    """Calibration curve configuration"""
    base_confidence: float
    adjustments: Dict[str, float]


class BaseCalibrator(ABC):
    """Base class for calibrators"""
    
    @abstractmethod
    def calibrate(self, confidence: float, context: Optional[Dict[str, Any]] = None) -> float:
        """Calibrate a confidence value"""
        pass


class DomainCalibrator(BaseCalibrator):
    """Domain-specific calibration"""
    
    def __init__(self, domain: str, curves: Optional[Dict[str, CalibrationCurve]] = None):
        self.domain = domain
        self.curves = curves or self._get_default_curves(domain)
    
    def _get_default_curves(self, domain: str) -> Dict[str, CalibrationCurve]:
        """Get default calibration curves for domain"""
        if domain == "security":
            return {
                "authentication": CalibrationCurve(0.6, {"critical": -0.15, "normal": 0.0}),
                "authorization": CalibrationCurve(0.6, {"critical": -0.3, "normal": -0.1}),
                "logging": CalibrationCurve(0.8, {"critical": -0.05, "normal": 0.0}),
            }
        elif domain == "medical":
            return {
                "diagnosis": CalibrationCurve(0.45, {"confirmed": 0.2, "preliminary": -0.2}),
                "treatment": CalibrationCurve(0.6, {"approved": 0.1, "experimental": -0.3}),
                "information": CalibrationCurve(0.85, {"risk": {"low": 0.05}, "verified": 0.1, "unverified": -0.2}),
            }
        return {}
    
    def calibrate(self, confidence: float, context: Optional[Dict[str, Any]] = None) -> float:
        """Calibrate based on domain context"""
        if not context:
            return confidence * 0.9  # Default conservative adjustment
        
        category = context.get("category", "default")
        if category in self.curves:
            curve = self.curves[category]
            adjustment = 0.0
            
            # Apply adjustments based on context
            for key, value in context.items():
                if key in curve.adjustments:
                    if isinstance(value, bool) and value:
                        adjustment += curve.adjustments[key]
                    elif isinstance(value, str):
                        # Check if the adjustment is a dict mapping values to adjustments
                        if isinstance(curve.adjustments[key], dict):
                            adjustment += curve.adjustments[key].get(value, 0.0)
                        elif value == key:
                            adjustment += curve.adjustments[key]
                elif isinstance(value, str) and value in curve.adjustments:
                    # Handle case where value matches an adjustment key
                    adjustment += curve.adjustments[value]
            
            # Apply base confidence and adjustments
            calibrated = curve.base_confidence + adjustment
            # Ensure calibrated is within bounds
            calibrated = max(0.0, min(1.0, calibrated))
            # Blend with original confidence
            return (calibrated + confidence) / 2
        
        # Conservative adjustment for unknown categories
        if self.domain == "security" and context.get("critical"):
            return confidence * 0.7
        elif self.domain == "medical":
            return confidence * 0.8
            
        return confidence * 0.95


class SecurityCalibrator(BaseCalibrator):
    """Security-specific calibration"""
    
    def __init__(self):
        self.risk_levels = {
            "delete_user": "critical",
            "delete_database": "critical", 
            "delete_all": "critical",
            "password_validation": "high",
            "password_reset": "high",
            "password_change": "high",
            "authentication": "high",
            "read_sensitive": "medium",
            "write_sensitive": "high",
            "read_public_data": "low",
            "read_public": "low",
            "list_public": "low",
        }
        
        self.risk_factors = {
            "critical": 0.4,
            "high": 0.6,
            "medium": 0.8,
            "low": 0.95,
        }
    
    def calibrate_for_operation(self, cv: ConfidenceValue, operation: str) -> ConfidenceValue:
        """Calibrate confidence based on operation type"""
        risk_level = self._get_risk_level(operation)
        factor = self.risk_factors.get(risk_level, 0.9)
        
        return ConfidenceValue(
            value=cv.value,
            confidence=min(cv.confidence * factor, cv.confidence),  # Never increase confidence
            timestamp=cv.timestamp
        )
    
    def _get_risk_level(self, operation: str) -> str:
        """Determine risk level of operation"""
        # Direct match
        if operation in self.risk_levels:
            return self.risk_levels[operation]
        
        # Pattern matching
        operation_lower = operation.lower()
        if "delete" in operation_lower or "remove" in operation_lower:
            return "critical"
        elif "password" in operation_lower or "auth" in operation_lower:
            return "high"
        elif "write" in operation_lower or "update" in operation_lower:
            return "medium"
        elif "read" in operation_lower or "get" in operation_lower:
            return "low"
        
        return "medium"  # Default to medium risk
    
    def set_risk_level(self, operation: str, level: str):
        """Set custom risk level for operation"""
        self.risk_levels[operation] = level
    
    def calibrate(self, confidence: float, context: Optional[Dict[str, Any]] = None) -> float:
        """Generic calibration method"""
        if context and "operation" in context:
            cv = ConfidenceValue("", confidence)
            result = self.calibrate_for_operation(cv, context["operation"])
            return result.confidence
        return confidence * 0.9


class InteractiveCalibrator(BaseCalibrator):
    """Learns from feedback to improve calibration"""
    
    def __init__(self, method: str = "isotonic"):
        self.method = method
        self.observations = []
        self._model = None
    
    def add_observation(self, predicted: float, actual: float):
        """Add a prediction/actual pair"""
        self.observations.append((predicted, actual))
        self._model = None  # Reset model to retrain
    
    def calibrate(self, confidence: float, context: Optional[Dict[str, Any]] = None) -> float:
        """Calibrate using learned model"""
        if len(self.observations) < 2:
            return confidence
        
        if self._model is None:
            self._train_model()
        
        if self.method == "isotonic":
            return self._isotonic_calibrate(confidence)
        elif self.method == "platt":
            return self._platt_calibrate(confidence)
        else:
            # Simple linear adjustment
            return self._linear_calibrate(confidence)
    
    def _train_model(self):
        """Train calibration model"""
        if self.method == "isotonic":
            self._train_isotonic()
        elif self.method == "platt":
            self._train_platt()
    
    def _linear_calibrate(self, confidence: float) -> float:
        """Simple linear calibration"""
        if not self.observations:
            return confidence
        
        # Calculate average adjustment
        total_diff = sum(actual - pred for pred, actual in self.observations)
        avg_adjustment = total_diff / len(self.observations)
        
        # Apply adjustment with dampening
        calibrated = confidence + (avg_adjustment * 0.5)
        return max(0.0, min(1.0, calibrated))
    
    def _isotonic_calibrate(self, confidence: float) -> float:
        """Isotonic regression calibration"""
        if not self.observations:
            return confidence
        
        # Simple implementation: find nearest neighbors
        sorted_obs = sorted(self.observations, key=lambda x: x[0])
        
        # Find surrounding points
        lower = None
        upper = None
        
        for pred, actual in sorted_obs:
            if pred <= confidence:
                lower = (pred, actual)
            elif upper is None:
                upper = (pred, actual)
                break
        
        # Interpolate
        if lower is None:
            return sorted_obs[0][1]
        elif upper is None:
            return sorted_obs[-1][1]
        else:
            # Linear interpolation
            x1, y1 = lower
            x2, y2 = upper
            if x2 - x1 > 0:
                slope = (y2 - y1) / (x2 - x1)
                return y1 + slope * (confidence - x1)
            else:
                return (y1 + y2) / 2
    
    def _train_isotonic(self):
        """Train isotonic regression model"""
        # For now, we'll use the observations directly
        self._model = "isotonic_trained"
    
    def _platt_calibrate(self, confidence: float) -> float:
        """Platt scaling calibration"""
        # Simplified sigmoid calibration
        if not hasattr(self, '_platt_params'):
            self._train_platt()
        
        a, b = self._platt_params
        # Sigmoid transformation
        calibrated = 1.0 / (1.0 + math.exp(a * confidence + b))
        return calibrated
    
    def _train_platt(self):
        """Train Platt scaling parameters"""
        if len(self.observations) < 2:
            self._platt_params = (1.0, 0.0)
            return
        
        # Simple parameter estimation
        # In practice, this would use logistic regression
        preds = [p for p, _ in self.observations]
        actuals = [a for _, a in self.observations]
        
        # Estimate slope (a) and intercept (b)
        mean_pred = sum(preds) / len(preds)
        mean_actual = sum(actuals) / len(actuals)
        
        # Simple linear approximation for demonstration
        if mean_pred > mean_actual:
            # Overconfident
            a = 2.0
            b = -1.0
        else:
            # Underconfident
            a = 0.5
            b = 0.2
        
        self._platt_params = (a, b)


class TemporalCalibrator(BaseCalibrator):
    """Time-based confidence decay"""
    
    def __init__(self, half_life: timedelta, 
                 decay_function: Optional[Callable] = None,
                 min_confidence: float = 0.0):
        self.half_life = half_life
        self.decay_function = decay_function or self._exponential_decay
        self.min_confidence = min_confidence
    
    def calibrate(self, confidence: Union[float, ConfidenceValue], context: Optional[Dict[str, Any]] = None) -> float:
        """Apply temporal decay"""
        # Extract confidence value if ConfidenceValue object
        if isinstance(confidence, ConfidenceValue):
            conf_value = confidence.confidence
            # Check if the ConfidenceValue has a timestamp
            if confidence.timestamp:
                return self.calibrate_with_time(conf_value, confidence.timestamp)
        else:
            conf_value = confidence
        
        # Handle direct datetime context
        if isinstance(context, datetime):
            return self.calibrate_with_time(conf_value, context)
        
        # Handle dict context with timestamp
        if context and isinstance(context, dict) and "timestamp" in context:
            timestamp = context["timestamp"]
            if isinstance(timestamp, datetime):
                return self.calibrate_with_time(conf_value, timestamp)
        
        # No timestamp, apply small decay
        return conf_value * 0.95
    
    def calibrate_with_time(self, confidence: float, timestamp: datetime) -> float:
        """Calibrate based on age"""
        age = datetime.now() - timestamp
        decay = self.decay_function(age.total_seconds() / 3600, self.half_life.total_seconds() / 3600)
        calibrated = confidence * decay
        return max(self.min_confidence, calibrated)
    
    def _exponential_decay(self, age_hours: float, half_life_hours: float) -> float:
        """Exponential decay function"""
        if half_life_hours <= 0:
            return 1.0
        return 0.5 ** (age_hours / half_life_hours)
    
    def with_minimum_confidence(self, min_conf: float) -> 'TemporalCalibrator':
        """Set minimum confidence threshold"""
        self.min_confidence = min_conf
        return self


class CalibratorChain:
    """Chain multiple calibrators"""
    
    def __init__(self, calibrators: List[BaseCalibrator]):
        self.calibrators = calibrators
    
    def calibrate(self, confidence: Union[float, ConfidenceValue], context: Optional[Dict[str, Any]] = None) -> Union[float, ConfidenceValue]:
        """Apply all calibrators in sequence"""
        # Handle ConfidenceValue input
        if isinstance(confidence, ConfidenceValue):
            # Create a copy to preserve the original
            result = ConfidenceValue(
                value=confidence.value,
                confidence=confidence.confidence,
                timestamp=confidence.timestamp
            )
            
            # Apply each calibrator
            for calibrator in self.calibrators:
                if hasattr(calibrator, 'calibrate'):
                    # Check if this is a custom calibrator that modifies the object
                    if not isinstance(calibrator, (BaseCalibrator, TemporalCalibrator, SecurityCalibrator)):
                        # Custom calibrator - let it modify the object directly
                        result = calibrator.calibrate(result, context)
                    elif isinstance(calibrator, TemporalCalibrator):
                        result.confidence = calibrator.calibrate(result, context)
                    elif isinstance(calibrator, SecurityCalibrator) and context and "operation" in context:
                        # SecurityCalibrator has special handling
                        calibrated_cv = calibrator.calibrate_for_operation(result, context["operation"])
                        result.confidence = calibrated_cv.confidence
                    else:
                        result.confidence = calibrator.calibrate(result.confidence, context)
            
            return result
        
        # Handle float input
        result = confidence
        for calibrator in self.calibrators:
            result = calibrator.calibrate(result, context)
        return result
    
    def calibrate_value(self, cv: ConfidenceValue, context: Optional[Dict[str, Any]] = None) -> ConfidenceValue:
        """Calibrate a ConfidenceValue"""
        calibrated_conf = self.calibrate(cv.confidence, context)
        
        # Special handling for SecurityCalibrator
        for calibrator in self.calibrators:
            if isinstance(calibrator, SecurityCalibrator) and context and "operation" in context:
                cv.confidence = calibrated_conf
                return calibrator.calibrate_for_operation(cv, context["operation"])
        
        return ConfidenceValue(
            value=cv.value,
            confidence=calibrated_conf,
            timestamp=cv.timestamp
        )


# Calibration metrics functions
def calculate_ece(predictions: List[float], actuals: List[float], n_bins: int = 10) -> float:
    """Calculate Expected Calibration Error"""
    if len(predictions) != len(actuals):
        raise ValueError("Predictions and actuals must have same length")
    
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    total_samples = len(predictions)
    
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        
        # Find predictions in this bin
        in_bin = [(p, a) for p, a in zip(predictions, actuals) 
                  if bin_lower <= p < bin_upper or (i == n_bins - 1 and p == bin_upper)]
        
        if len(in_bin) > 0:
            bin_confidence = sum(p for p, _ in in_bin) / len(in_bin)
            bin_accuracy = sum(a for _, a in in_bin) / len(in_bin)
            bin_weight = len(in_bin) / total_samples
            
            ece += bin_weight * abs(bin_confidence - bin_accuracy)
    
    return ece


def get_reliability_diagram_data(predictions: List[float], actuals: List[float], 
                                n_bins: int = 10) -> List[Dict[str, float]]:
    """Get data for reliability diagram plotting"""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    diagram_data = []
    
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        
        # Find predictions in this bin
        in_bin = [(p, a) for p, a in zip(predictions, actuals) 
                  if bin_lower <= p < bin_upper or (i == n_bins - 1 and p == bin_upper)]
        
        if len(in_bin) > 0:
            bin_confidence = sum(p for p, _ in in_bin) / len(in_bin)
            bin_accuracy = sum(a for _, a in in_bin) / len(in_bin)
            
            diagram_data.append({
                "confidence": bin_confidence,
                "accuracy": bin_accuracy,
                "count": len(in_bin),
                "bin_lower": bin_lower,
                "bin_upper": bin_upper
            })
    
    return diagram_data