"""
Tests for confidence calibration functionality
"""

import pytest
from datetime import datetime, timedelta
import numpy as np

from prism_confidence.calibration import (
    DomainCalibrator,
    SecurityCalibrator,
    InteractiveCalibrator,
    TemporalCalibrator,
    CalibratorChain,
    CalibrationCurve,
)
from prism_confidence import ConfidenceValue


class TestDomainCalibrator:
    """Test domain-specific calibration"""

    def test_security_domain_calibration(self):
        """Test security domain calibration"""
        calibrator = DomainCalibrator("security")

        # Critical operations should reduce confidence
        result = calibrator.calibrate(
            0.8, {"category": "authentication", "critical": True}
        )
        assert result < 0.7  # Conservative for critical ops

        # Non-critical operations maintain higher confidence
        result = calibrator.calibrate(
            0.8, {"category": "logging", "critical": False}
        )
        assert 0.75 <= result <= 0.85

    def test_medical_domain_calibration(self):
        """Test medical domain calibration"""
        calibrator = DomainCalibrator("medical")

        # Diagnosis should be very conservative
        result = calibrator.calibrate(0.9, {"category": "diagnosis"})
        assert result < 0.7

        # Information queries can be less conservative
        result = calibrator.calibrate(
            0.9, {"category": "information", "risk": "low"}
        )
        assert result > 0.8

    def test_custom_calibration_curves(self):
        """Test custom calibration curves"""
        curves = {
            "test_category": CalibrationCurve(
                base_confidence=0.5,
                adjustments={"high_risk": -0.3, "low_risk": 0.1},
            )
        }

        calibrator = DomainCalibrator("custom", curves=curves)

        result = calibrator.calibrate(
            0.8, {"category": "test_category", "risk": "high_risk"}
        )
        assert abs(result - 0.5) < 0.1  # ~0.5 after adjustment


class TestSecurityCalibrator:
    """Test security-specific calibration"""

    @pytest.fixture
    def calibrator(self):
        return SecurityCalibrator()

    def test_operation_based_calibration(self, calibrator):
        """Test calibration based on operation type"""
        cv = ConfidenceValue("result", 0.9)

        # Critical operations
        result = calibrator.calibrate_for_operation(cv, "delete_user")
        assert result.confidence < 0.5

        result = calibrator.calibrate_for_operation(cv, "password_reset")
        assert result.confidence < 0.6

        # Read operations
        result = calibrator.calibrate_for_operation(cv, "read_public_data")
        assert result.confidence > 0.7

    def test_confidence_thresholds(self, calibrator):
        """Test that calibration respects thresholds"""
        # Very low confidence should stay low
        cv = ConfidenceValue("result", 0.2)
        result = calibrator.calibrate_for_operation(cv, "any_operation")
        assert result.confidence <= 0.2

        # Maximum confidence should be capped
        cv = ConfidenceValue("result", 1.0)
        result = calibrator.calibrate_for_operation(cv, "read_operation")
        assert result.confidence < 1.0  # Never perfect confidence

    def test_custom_risk_levels(self, calibrator):
        """Test custom risk level configuration"""
        calibrator.set_risk_level("custom_operation", "critical")

        cv = ConfidenceValue("result", 0.8)
        result = calibrator.calibrate_for_operation(cv, "custom_operation")
        assert result.confidence < 0.5


class TestInteractiveCalibrator:
    """Test interactive/learning calibration"""

    @pytest.fixture
    def calibrator(self):
        return InteractiveCalibrator()

    def test_learning_from_feedback(self, calibrator):
        """Test calibrator learns from feedback"""
        # Initial calibration (no data)
        initial = calibrator.calibrate(0.8)
        assert abs(initial - 0.8) < 0.1  # Minimal adjustment

        # Add feedback showing overconfidence
        for _ in range(10):
            calibrator.add_observation(predicted=0.8, actual=0.6)
            calibrator.add_observation(predicted=0.9, actual=0.7)

        # Should now reduce high confidence values
        adjusted = calibrator.calibrate(0.8)
        assert adjusted < 0.7  # Learned to reduce confidence

    def test_isotonic_regression(self, calibrator):
        """Test isotonic regression calibration"""
        # Add diverse training data
        training_data = [
            (0.1, 0.05),
            (0.2, 0.15),
            (0.3, 0.25),
            (0.4, 0.35),
            (0.5, 0.5),
            (0.6, 0.65),
            (0.7, 0.75),
            (0.8, 0.85),
            (0.9, 0.95),
        ]

        for predicted, actual in training_data:
            calibrator.add_observation(predicted, actual)

        # Test calibration maintains monotonicity
        values = [0.2, 0.4, 0.6, 0.8]
        calibrated = [calibrator.calibrate(v) for v in values]

        # Check monotonic increasing
        for i in range(len(calibrated) - 1):
            assert calibrated[i] <= calibrated[i + 1]

    def test_platt_scaling(self, calibrator):
        """Test Platt scaling calibration"""
        calibrator = InteractiveCalibrator(method="platt")

        # Add training data
        np.random.seed(42)
        for _ in range(100):
            pred = np.random.random()
            # Simulate systematic overconfidence
            actual = pred * 0.8 + np.random.normal(0, 0.05)
            actual = np.clip(actual, 0, 1)
            calibrator.add_observation(pred, actual)

        # Test calibration reduces overconfidence
        test_values = [0.6, 0.7, 0.8, 0.9]
        for val in test_values:
            calibrated = calibrator.calibrate(val)
            assert calibrated < val  # Should reduce confidence


class TestTemporalCalibrator:
    """Test time-based confidence decay"""

    def test_exponential_decay(self):
        """Test exponential decay over time"""
        calibrator = TemporalCalibrator(half_life=timedelta(days=1))
        now = datetime.now()

        # Fresh data
        result = calibrator.calibrate(0.9, now)
        assert result > 0.85

        # One half-life old
        result = calibrator.calibrate(0.9, now - timedelta(days=1))
        assert 0.4 < result < 0.5  # ~0.45 (half of 0.9)

        # Two half-lives old
        result = calibrator.calibrate(0.9, now - timedelta(days=2))
        assert 0.2 < result < 0.25  # ~0.225 (quarter of 0.9)

    def test_custom_decay_functions(self):
        """Test custom decay functions"""

        # Linear decay
        def linear_decay(age_hours: float, half_life_hours: float) -> float:
            decay_rate = 0.5 / half_life_hours
            return max(0, 1 - decay_rate * age_hours)

        calibrator = TemporalCalibrator(
            half_life=timedelta(hours=10), decay_function=linear_decay
        )

        now = datetime.now()
        # 5 hours old (half of half-life)
        result = calibrator.calibrate(1.0, now - timedelta(hours=5))
        assert abs(result - 0.75) < 0.01  # Linear decay to 0.75

    def test_minimum_confidence(self):
        """Test minimum confidence threshold"""
        calibrator = TemporalCalibrator(
            half_life=timedelta(hours=1), min_confidence=0.1
        )

        # Very old data should not go below minimum
        result = calibrator.calibrate(0.9, datetime.now() - timedelta(days=30))
        assert result >= 0.1


class TestCalibratorChain:
    """Test chaining multiple calibrators"""

    def test_chain_application(self):
        """Test calibrators apply in sequence"""
        # Create calibrators
        temporal = TemporalCalibrator(half_life=timedelta(days=1))
        security = SecurityCalibrator()

        chain = CalibratorChain([temporal, security])

        # Test with old, security-critical data
        cv = ConfidenceValue(
            value="sensitive_data",
            confidence=0.9,
            timestamp=datetime.now() - timedelta(days=1),
        )

        result = chain.calibrate(cv, {"operation": "delete_database"})

        # Should be heavily reduced by both calibrators
        assert result.confidence < 0.3

    def test_empty_chain(self):
        """Test empty chain returns unchanged value"""
        chain = CalibratorChain([])
        cv = ConfidenceValue("test", 0.8)
        result = chain.calibrate(cv)
        assert result.confidence == 0.8

    def test_metadata_preservation(self):
        """Test metadata is preserved through chain"""

        class MetadataCalibrator:
            def calibrate(self, value, context=None):
                if hasattr(value, "confidence"):
                    value.metadata = {"processed": True}
                    return value
                return value

        chain = CalibratorChain([MetadataCalibrator()])
        cv = ConfidenceValue("test", 0.8)
        result = chain.calibrate(cv)

        assert hasattr(result, "metadata")
        assert result.metadata["processed"] is True


class TestCalibrationMetrics:
    """Test calibration evaluation metrics"""

    def test_expected_calibration_error(self):
        """Test ECE calculation"""
        from prism_confidence.calibration import calculate_ece

        # Perfect calibration
        predictions = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
        actuals = predictions  # Perfect calibration
        ece = calculate_ece(predictions, actuals, n_bins=10)
        assert ece < 0.01

        # Systematic overconfidence
        predictions = [0.2, 0.4, 0.6, 0.8, 0.9]
        actuals = [0.1, 0.2, 0.3, 0.4, 0.5]
        ece = calculate_ece(predictions, actuals, n_bins=5)
        assert ece > 0.2

    def test_reliability_diagram_data(self):
        """Test data generation for reliability diagrams"""
        from prism_confidence.calibration import get_reliability_diagram_data

        predictions = np.random.random(100)
        actuals = predictions + np.random.normal(0, 0.1, 100)
        actuals = np.clip(actuals, 0, 1)

        bin_data = get_reliability_diagram_data(predictions, actuals, n_bins=10)

        assert len(bin_data) <= 10
        assert all("confidence" in b and "accuracy" in b for b in bin_data)
        assert all(0 <= b["confidence"] <= 1 for b in bin_data)
        assert all(0 <= b["accuracy"] <= 1 for b in bin_data)