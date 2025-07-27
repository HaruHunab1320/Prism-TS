"""
Tests for confidence patterns and advanced features
"""

import pytest
from datetime import datetime, timedelta
from prism_confidence.patterns import (
    ConfidenceBudgetManager,
    ConfidenceContractManager,
    DifferentialConfidenceManager,
    TemporalConfidence,
    ConfidenceThreshold,
    ConfidenceGate,
)
from prism_confidence import ConfidenceValue


class TestConfidenceBudgetManager:
    """Test confidence budget pattern"""

    def test_budget_allocation(self):
        """Test basic budget allocation"""
        manager = ConfidenceBudgetManager(min_total=2.5)

        # Add items with confidence
        manager.add_item("decision1", 0.8)
        manager.add_item("decision2", 0.7)
        manager.add_item("decision3", 0.9)

        # Total: 0.8 + 0.7 + 0.9 = 2.4
        assert not manager.is_budget_met()
        assert manager.remaining_budget() == 0.1

        # Add one more item to meet budget
        manager.add_item("decision4", 0.6)
        assert manager.is_budget_met()

    def test_budget_optimization(self):
        """Test optimal item selection for budget"""
        manager = ConfidenceBudgetManager(min_total=2.0)

        # Add many items
        items = [
            ("item1", 0.9, 100),  # (name, confidence, value)
            ("item2", 0.5, 50),
            ("item3", 0.8, 80),
            ("item4", 0.3, 30),
            ("item5", 0.7, 75),
        ]

        for name, conf, value in items:
            manager.add_item(name, conf, metadata={"value": value})

        # Get optimal selection to meet budget
        selected = manager.optimize_selection(
            optimization_key="value",
            constraint="min_confidence",
        )

        # Should select highest value items that meet confidence budget
        total_confidence = sum(item.confidence for item in selected)
        assert total_confidence >= 2.0

    def test_budget_with_categories(self):
        """Test budget allocation across categories"""
        manager = ConfidenceBudgetManager(min_total=3.0)

        # Add items in different categories
        manager.add_item("auth_check", 0.9, category="security")
        manager.add_item("data_validation", 0.8, category="security")
        manager.add_item("ui_render", 0.6, category="display")
        manager.add_item("animation", 0.5, category="display")

        # Check category budgets
        security_budget = manager.category_budget("security")
        assert security_budget == 1.7

        display_budget = manager.category_budget("display")
        assert display_budget == 1.1

    def test_budget_warnings(self):
        """Test budget warning thresholds"""
        manager = ConfidenceBudgetManager(
            min_total=3.0, 
            warning_threshold=0.5  # Warn when 50% remaining
        )

        manager.add_item("item1", 0.8)
        manager.add_item("item2", 0.7)

        # Total: 1.5, need 3.0, so 50% complete
        warnings = manager.get_warnings()
        assert len(warnings) > 0
        assert "50%" in warnings[0]


class TestConfidenceContractManager:
    """Test confidence contract pattern"""

    def test_simple_contract(self):
        """Test basic contract validation"""
        manager = ConfidenceContractManager()

        # Define a contract
        contract = {
            "data_quality": 0.8,
            "model_accuracy": 0.85,
            "latency_confidence": 0.7,
        }

        manager.add_contract("ml_pipeline", contract)

        # Check if requirements are met
        actual = {
            "data_quality": ConfidenceValue("good", 0.82),
            "model_accuracy": ConfidenceValue("high", 0.9),
            "latency_confidence": ConfidenceValue("acceptable", 0.75),
        }

        assert manager.validate_contract("ml_pipeline", actual)

    def test_failed_contract(self):
        """Test contract validation failure"""
        manager = ConfidenceContractManager()

        contract = {
            "security_check": 0.9,
            "data_integrity": 0.85,
        }

        manager.add_contract("secure_operation", contract)

        actual = {
            "security_check": ConfidenceValue("passed", 0.85),  # Below required
            "data_integrity": ConfidenceValue("verified", 0.9),
        }

        result = manager.validate_contract("secure_operation", actual)
        assert not result

        # Get failure details
        failures = manager.get_failures("secure_operation", actual)
        assert "security_check" in failures
        assert failures["security_check"]["required"] == 0.9
        assert failures["security_check"]["actual"] == 0.85

    def test_contract_with_conditions(self):
        """Test conditional contract requirements"""
        manager = ConfidenceContractManager()

        # Contract with conditional requirements
        def dynamic_contract(context):
            base = {"authentication": 0.8}
            
            if context.get("is_admin"):
                base["admin_verification"] = 0.95
            
            if context.get("sensitive_data"):
                base["encryption_confidence"] = 0.9
                
            return base

        manager.add_dynamic_contract("access_control", dynamic_contract)

        # Test with admin context
        context = {"is_admin": True, "sensitive_data": False}
        requirements = manager.get_requirements("access_control", context)
        
        assert "admin_verification" in requirements
        assert requirements["admin_verification"] == 0.95


class TestDifferentialConfidenceManager:
    """Test differential confidence pattern"""

    def test_aspect_confidence(self):
        """Test confidence across different aspects"""
        manager = DifferentialConfidenceManager()

        # Add confidence for different aspects of a decision
        decision = manager.create_decision("product_launch")
        
        decision.add_aspect("market_research", 0.85)
        decision.add_aspect("technical_readiness", 0.7)
        decision.add_aspect("financial_projection", 0.6)
        decision.add_aspect("team_capability", 0.9)

        # Get overall confidence (various aggregation methods)
        assert decision.overall_confidence("min") == 0.6
        assert decision.overall_confidence("max") == 0.9
        assert abs(decision.overall_confidence("mean") - 0.75) < 0.01

    def test_aspect_weights(self):
        """Test weighted aspects"""
        manager = DifferentialConfidenceManager()

        decision = manager.create_decision("investment")
        
        # Add weighted aspects
        decision.add_aspect("roi_analysis", 0.8, weight=2.0)
        decision.add_aspect("risk_assessment", 0.6, weight=3.0)
        decision.add_aspect("market_timing", 0.9, weight=1.0)

        # Weighted average: (0.8*2 + 0.6*3 + 0.9*1) / (2+3+1) = 0.717
        weighted = decision.overall_confidence("weighted")
        assert abs(weighted - 0.717) < 0.01

    def test_aspect_thresholds(self):
        """Test aspect threshold requirements"""
        manager = DifferentialConfidenceManager()

        decision = manager.create_decision("deployment")
        decision.set_aspect_threshold("security", 0.8)
        decision.set_aspect_threshold("performance", 0.7)

        decision.add_aspect("security", 0.75)  # Below threshold
        decision.add_aspect("performance", 0.85)  # Above threshold

        assert not decision.meets_all_thresholds()
        
        violations = decision.get_threshold_violations()
        assert "security" in violations
        assert violations["security"]["required"] == 0.8
        assert violations["security"]["actual"] == 0.75


class TestTemporalConfidence:
    """Test temporal confidence patterns"""

    def test_confidence_window(self):
        """Test confidence over time windows"""
        temporal = TemporalConfidence(window_size=timedelta(hours=1))

        now = datetime.now()
        
        # Add confidence values over time
        temporal.add_observation(0.8, now - timedelta(minutes=30))
        temporal.add_observation(0.7, now - timedelta(minutes=20))
        temporal.add_observation(0.9, now - timedelta(minutes=10))
        temporal.add_observation(0.6, now)

        # Get confidence for current window
        current = temporal.current_confidence()
        assert 0.6 <= current <= 0.9

        # Get trend
        trend = temporal.get_trend()
        assert trend is not None  # Should detect some trend

    def test_confidence_decay_pattern(self):
        """Test custom decay patterns"""
        # Exponential decay
        temporal = TemporalConfidence(
            decay_function=lambda age: 0.5 ** (age.total_seconds() / 3600)
        )

        now = datetime.now()
        temporal.add_observation(1.0, now - timedelta(hours=1))

        # After 1 hour, should be ~0.5
        decayed = temporal.get_decayed_confidence(now - timedelta(hours=1))
        assert abs(decayed - 0.5) < 0.1

    def test_confidence_forecasting(self):
        """Test confidence forecasting"""
        temporal = TemporalConfidence()

        # Add historical data with trend
        now = datetime.now()
        for i in range(10):
            # Increasing confidence over time
            confidence = 0.5 + (i * 0.05)
            temporal.add_observation(
                confidence, 
                now - timedelta(hours=10-i)
            )

        # Forecast future confidence
        future = temporal.forecast(now + timedelta(hours=1))
        
        # Should predict continued increase
        assert future > temporal.current_confidence()


class TestConfidenceGates:
    """Test confidence gating patterns"""

    def test_threshold_gate(self):
        """Test simple threshold gating"""
        gate = ConfidenceGate(threshold=0.7)

        # High confidence passes
        high = ConfidenceValue("proceed", 0.8)
        assert gate.should_proceed(high)

        # Low confidence fails
        low = ConfidenceValue("proceed", 0.6)
        assert not gate.should_proceed(low)

    def test_multi_gate_and(self):
        """Test multiple gates with AND logic"""
        gate = ConfidenceGate.multi_gate(
            thresholds={
                "accuracy": 0.8,
                "completeness": 0.7,
                "timeliness": 0.6,
            },
            logic="and"
        )

        values = {
            "accuracy": ConfidenceValue("high", 0.85),
            "completeness": ConfidenceValue("good", 0.75),
            "timeliness": ConfidenceValue("ok", 0.65),
        }

        # All pass thresholds
        assert gate.should_proceed_multi(values)

        # One fails
        values["accuracy"] = ConfidenceValue("low", 0.75)
        assert not gate.should_proceed_multi(values)

    def test_multi_gate_or(self):
        """Test multiple gates with OR logic"""
        gate = ConfidenceGate.multi_gate(
            thresholds={
                "primary": 0.9,
                "secondary": 0.8,
                "fallback": 0.7,
            },
            logic="or"
        )

        values = {
            "primary": ConfidenceValue("low", 0.6),
            "secondary": ConfidenceValue("low", 0.6),
            "fallback": ConfidenceValue("ok", 0.75),  # Passes
        }

        # At least one passes
        assert gate.should_proceed_multi(values)

    def test_adaptive_threshold(self):
        """Test adaptive threshold adjustment"""
        gate = ConfidenceGate(threshold=0.7, adaptive=True)

        # Track success/failure
        for _ in range(10):
            # High confidence that succeeds
            value = ConfidenceValue("action", 0.85)
            gate.record_outcome(value, success=True)

        for _ in range(5):
            # Low confidence that fails
            value = ConfidenceValue("action", 0.6)
            gate.record_outcome(value, success=False)

        # Threshold should adapt based on outcomes
        new_threshold = gate.get_adaptive_threshold()
        assert new_threshold != 0.7  # Should have adapted

    def test_confidence_buffer(self):
        """Test confidence buffering for stability"""
        gate = ConfidenceGate(
            threshold=0.7,
            buffer_size=3,
            buffer_method="average"
        )

        # Add fluctuating values
        gate.add_to_buffer(ConfidenceValue("action", 0.6))
        gate.add_to_buffer(ConfidenceValue("action", 0.8))
        gate.add_to_buffer(ConfidenceValue("action", 0.7))

        # Buffered decision based on average
        assert gate.should_proceed_buffered()  # Average is 0.7