"""
Tests for confidence extraction functionality
"""

import pytest
from unittest.mock import Mock, AsyncMock
import asyncio
from datetime import datetime, timedelta

from prism_confidence import (
    ConfidenceExtractor,
    ConfidenceValue,
    ConsistencyOptions,
    ResponseAnalysisOptions,
)


class TestConfidenceExtractor:
    """Test confidence extraction functionality"""

    @pytest.fixture
    def extractor(self):
        """Create a fresh extractor instance"""
        return ConfidenceExtractor()

    def test_simple_extraction(self, extractor):
        """Test simple confidence extraction from text"""
        # High confidence
        result = extractor.extract("I am definitely certain that this is absolutely correct.")
        assert result is not None
        assert result.value > 0.65
        assert result.value <= 1.0
        assert "certainty" in result.explanation.lower()

        # Low confidence
        result = extractor.extract(
            "This might possibly be correct, but I am not sure. It could be wrong perhaps."
        )
        assert result.value < 0.55
        assert "hedging" in result.explanation.lower()

    def test_extract_with_options(self, extractor):
        """Test extraction with specific options"""
        # Test consistency method
        def sample_func():
            return "The answer is 42."

        result = extractor.extract_with_options(
            sample_func, {"method": "consistency", "samples": 3}
        )
        assert result is not None
        assert result.metadata["method"] == "consistency"
        assert len(result.metadata["samples"]) == 3

        # Test response analysis method
        result = extractor.extract_with_options(
            "I am certain.", {"method": "response_analysis"}
        )
        assert result.metadata["method"] == "response_analysis"

    @pytest.mark.asyncio
    async def test_from_consistency_async(self, extractor):
        """Test async consistency-based extraction"""
        # Consistent responses
        async def consistent_sampler():
            return "The answer is consistently 42."

        result = await extractor.from_consistency_async(
            consistent_sampler, ConsistencyOptions(samples=5)
        )
        assert result.value > 0.8
        assert result.metadata["consistency"] > 0.8

        # Inconsistent responses
        counter = 0
        responses = [
            "The answer is 42.",
            "Actually, it might be 43.",
            "No, I think it's 41.",
            "Could be anywhere from 40 to 45.",
            "I'm not sure about the answer.",
        ]

        async def inconsistent_sampler():
            nonlocal counter
            response = responses[counter % len(responses)]
            counter += 1
            return response

        result = await extractor.from_consistency_async(
            inconsistent_sampler, ConsistencyOptions(samples=5)
        )
        assert result.value < 0.5
        assert result.metadata["consistency"] < 0.5

    def test_from_response_analysis(self, extractor):
        """Test response analysis extraction"""
        # Test with default options
        result = extractor.from_response_analysis("The answer is 42.")
        assert 0.4 <= result.value <= 0.7  # Neutral response

        # Test with custom markers
        options = ResponseAnalysisOptions(
            custom_markers={
                "high": ["absolutely", "definitely"],
                "medium": ["likely", "probably"],
                "low": ["maybe", "possibly", "unclear"],
            }
        )

        result = extractor.from_response_analysis(
            "The answer is absolutely correct.", options
        )
        assert result.value > 0.7

        result = extractor.from_response_analysis(
            "The answer is possibly incorrect.", options
        )
        assert result.value < 0.5

    def test_from_structured_response(self, extractor):
        """Test structured response parsing"""
        # Direct confidence field
        result = extractor.from_structured_response(
            {"answer": "42", "confidence": 0.85}
        )
        assert result.value == 0.85

        # Confidence as percentage
        result = extractor.from_structured_response(
            {"answer": "42", "confidence": 85}
        )
        assert result.value == 0.85

        # Nested confidence
        result = extractor.from_structured_response(
            {"result": {"value": "42", "confidence": 0.75}}
        )
        assert result.value == 0.75

        # Alternative field names
        result = extractor.from_structured_response(
            {"answer": "42", "certainty": 0.9}
        )
        assert result.value == 0.9

        # Invalid confidence
        with pytest.raises(ValueError):
            extractor.from_structured_response(
                {"answer": "42", "confidence": 1.5}
            )

    def test_from_perplexity(self, extractor):
        """Test perplexity-based confidence extraction"""
        # Low perplexity = high confidence
        result = extractor.from_perplexity(1.5)
        assert result.value > 0.8

        # Medium perplexity
        result = extractor.from_perplexity(10.0)
        assert 0.4 <= result.value <= 0.7

        # High perplexity = low confidence
        result = extractor.from_perplexity(50.0)
        assert result.value < 0.3

        # Test with custom scale
        result = extractor.from_perplexity(5.0, scale_factor=2.0)
        assert result.value != extractor.from_perplexity(5.0, scale_factor=1.0).value

    def test_linguistic_markers(self, extractor):
        """Test linguistic marker detection"""
        # Hedging indicators
        hedging_text = (
            "I think this might be correct, but I'm not entirely sure. "
            "It could possibly be wrong, perhaps we should verify."
        )
        result = extractor.from_linguistic_markers(hedging_text)
        assert result.value < 0.5
        assert len(result.metadata["hedging_indicators"]) > 3

        # Certainty indicators
        certain_text = (
            "I am absolutely certain this is definitely correct. "
            "Without a doubt, this is clearly the right answer."
        )
        result = extractor.from_linguistic_markers(certain_text)
        assert result.value > 0.7
        assert len(result.metadata["certainty_indicators"]) > 3

    def test_calculate_consistency(self, extractor):
        """Test consistency calculation"""
        # Perfect consistency
        samples = ["The answer is 42."] * 5
        consistency = extractor._calculate_consistency(samples)
        assert consistency > 0.95

        # No consistency
        samples = ["Answer A", "Answer B", "Answer C", "Answer D", "Answer E"]
        consistency = extractor._calculate_consistency(samples)
        assert consistency < 0.3

        # Partial consistency
        samples = ["The answer is 42.", "The answer is 42.", "Maybe 43?"]
        consistency = extractor._calculate_consistency(samples)
        assert 0.5 < consistency < 0.8

    def test_confidence_value_validation(self):
        """Test ConfidenceValue validation"""
        # Valid values
        cv = ConfidenceValue(42, 0.8)
        assert cv.value == 42
        assert cv.confidence == 0.8

        # Boundary values
        cv = ConfidenceValue("test", 0.0)
        assert cv.confidence == 0.0

        cv = ConfidenceValue("test", 1.0)
        assert cv.confidence == 1.0

        # Invalid values
        with pytest.raises(ValueError):
            ConfidenceValue("test", -0.1)

        with pytest.raises(ValueError):
            ConfidenceValue("test", 1.1)

    def test_metadata_preservation(self, extractor):
        """Test that metadata is properly preserved"""
        result = extractor.from_response_analysis(
            "I am moderately confident.",
            ResponseAnalysisOptions(
                check_hedging=True,
                check_certainty=True,
                check_specificity=True,
            ),
        )

        assert "method" in result.metadata
        assert "hedging_indicators" in result.metadata
        assert "certainty_indicators" in result.metadata
        assert "uncertainty_score" in result.metadata

    @pytest.mark.asyncio
    async def test_timeout_handling(self, extractor):
        """Test timeout handling in async operations"""
        async def slow_sampler():
            await asyncio.sleep(0.5)
            return "Slow response"

        with pytest.raises(asyncio.TimeoutError):
            await extractor.from_consistency_async(
                slow_sampler,
                ConsistencyOptions(samples=3, timeout=1.0),  # Total timeout
            )

    def test_smart_extract(self, extractor):
        """Test smart extraction that chooses the best method"""
        # Function input -> consistency method
        def sampler():
            return "Consistent answer"

        result = extractor.smart_extract(sampler)
        assert result.metadata["method"] == "consistency"

        # String input -> response analysis
        result = extractor.smart_extract("I am certain.")
        assert result.metadata["method"] == "response_analysis"

        # Object with confidence -> direct extraction
        result = extractor.smart_extract({"confidence": 0.8})
        assert result.value == 0.8

        # Unknown input -> default
        result = extractor.smart_extract(12345)
        assert result.value == 0.5  # Maximum uncertainty