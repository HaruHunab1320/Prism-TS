"""
Confidence extraction module
"""

import re
import asyncio
from typing import Any, Optional, Dict, List, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ConfidenceValue:
    """Represents a value with an associated confidence level"""
    value: Any
    confidence: float
    timestamp: Optional[datetime] = None

    def __post_init__(self):
        if not 0 <= self.confidence <= 1:
            raise ValueError(f"Confidence must be between 0 and 1, got {self.confidence}")
        # Clamp confidence to [0, 1]
        self.confidence = max(0.0, min(1.0, self.confidence))


@dataclass
class ConfidenceResult:
    """Result of confidence extraction"""
    value: float
    explanation: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    provenance: Optional[Dict] = None


@dataclass
class ConsistencyOptions:
    """Options for consistency-based extraction"""
    samples: int = 5
    timeout: Optional[float] = None
    aggregation: str = "mean"


@dataclass 
class ResponseAnalysisOptions:
    """Options for response analysis"""
    check_hedging: bool = True
    check_certainty: bool = True
    check_specificity: bool = False
    check_completeness: bool = False
    custom_markers: Optional[Dict[str, List[str]]] = None


class ConfidenceExtractor:
    """Extracts confidence values from various sources"""
    
    def __init__(self):
        """Initialize the confidence extractor"""
        self.hedging_words = ["might", "possibly", "perhaps", "maybe", "could", "not sure", "unclear", "unsure"]
        self.certainty_words = ["definitely", "certain", "absolutely", "clearly", "surely", "without a doubt"]
    
    def extract(self, source: Any) -> ConfidenceResult:
        """Extract confidence from a given source"""
        if isinstance(source, str):
            return self.from_response_analysis(source)
        elif isinstance(source, dict) and 'confidence' in source:
            return ConfidenceResult(value=source['confidence'], explanation="Direct confidence")
        elif callable(source):
            # It's a sampler function
            return self.from_consistency(source)
        return ConfidenceResult(value=0.5, explanation="Unknown source type")
    
    def extract_with_options(self, source: Any, options: Dict[str, Any]) -> ConfidenceResult:
        """Extract with specific method"""
        method = options.get('method', 'response_analysis')
        
        if method == 'consistency':
            samples = options.get('samples', 5)
            return self.from_consistency(source, ConsistencyOptions(samples=samples))
        elif method == 'response_analysis':
            return self.from_response_analysis(source)
        elif method == 'structured':
            return self.from_structured_response(source)
        
        return self.extract(source)
    
    def from_response_analysis(self, text: str, options: Optional[ResponseAnalysisOptions] = None) -> ConfidenceResult:
        """Extract confidence from text analysis"""
        if options is None:
            options = ResponseAnalysisOptions()
            
        lower_text = text.lower()
        
        # Count hedging and certainty markers
        hedging_count = sum(1 for word in self.hedging_words if word in lower_text)
        certainty_count = sum(1 for word in self.certainty_words if word in lower_text)
        
        # Check custom markers
        if options.custom_markers:
            if 'low' in options.custom_markers:
                hedging_count += sum(1 for word in options.custom_markers['low'] if word.lower() in lower_text)
            if 'high' in options.custom_markers:
                certainty_count += sum(1 for word in options.custom_markers['high'] if word.lower() in lower_text)
        
        # Calculate confidence
        confidence = 0.5
        explanation = "Neutral confidence"
        
        if certainty_count > hedging_count:
            confidence = 0.7 + min(certainty_count * 0.05, 0.25)
            explanation = "High confidence due to certainty markers"
        elif hedging_count > certainty_count:
            confidence = 0.5 - min(hedging_count * 0.05, 0.35)
            explanation = "Low confidence due to hedging"
        elif len(text) < 50:
            confidence = 0.6  # Short, direct answers get moderate confidence
            
        result = ConfidenceResult(
            value=confidence,
            explanation=explanation,
            metadata={
                'method': 'response_analysis',
                'hedging_indicators': [w for w in self.hedging_words if w in lower_text][:hedging_count] if hedging_count > 0 else [],
                'certainty_indicators': [w for w in self.certainty_words if w in lower_text][:certainty_count] if certainty_count > 0 else [],
                'uncertainty_score': hedging_count / (len(text.split()) + 1)
            }
        )
        
        return result
    
    def from_consistency(self, sampler: Callable[[], str], options: Optional[ConsistencyOptions] = None) -> ConfidenceResult:
        """Extract confidence from multiple samples"""
        if options is None:
            options = ConsistencyOptions()
            
        samples = []
        for _ in range(options.samples):
            sample = sampler()
            samples.append(sample)
            
        consistency = self._calculate_consistency(samples)
        confidence = consistency  # Simple mapping
        
        return ConfidenceResult(
            value=confidence,
            explanation=f"Confidence based on consistency: {consistency:.2f}",
            metadata={
                'method': 'consistency',
                'consistency': consistency,
                'samples': samples,
                'overlap': self._calculate_overlap(samples)
            }
        )
    
    async def from_consistency_async(self, sampler: Callable[[], Any], options: Optional[ConsistencyOptions] = None) -> ConfidenceResult:
        """Async version of consistency extraction"""
        if options is None:
            options = ConsistencyOptions()
            
        # Handle timeout
        async def get_sample():
            if asyncio.iscoroutinefunction(sampler):
                return await sampler()
            return sampler()
            
        samples = []
        
        if options.timeout:
            # Total timeout for all samples
            try:
                async with asyncio.timeout(options.timeout):
                    for _ in range(options.samples):
                        sample = await get_sample()
                        samples.append(sample)
            except asyncio.TimeoutError:
                raise
        else:
            for _ in range(options.samples):
                sample = await get_sample()
                samples.append(sample)
                
        consistency = self._calculate_consistency(samples)
        confidence = consistency
        
        return ConfidenceResult(
            value=confidence,
            explanation=f"Confidence based on consistency: {consistency:.2f}",
            metadata={
                'method': 'consistency',
                'consistency': consistency,
                'samples': samples
            }
        )
    
    def from_structured_response(self, data: Union[Dict[str, Any], Any]) -> ConfidenceResult:
        """Extract confidence from structured data"""
        if not isinstance(data, dict):
            if hasattr(data, '__dict__'):
                data = data.__dict__
            else:
                return ConfidenceResult(value=0.5, explanation="Not a structured response")
        
        # Direct confidence field
        for field in ['confidence', 'certainty', 'probability']:
            if field in data:
                conf = data[field]
                if isinstance(conf, (int, float)):
                    # Handle percentage (2-100)
                    if conf >= 2 and conf <= 100:
                        conf = conf / 100
                    # Check bounds
                    if conf < 0 or conf > 1:
                        raise ValueError(f"Invalid confidence value: {conf}")
                    return ConfidenceResult(value=conf, explanation=f"Direct {field} value")
        
        # Check nested structures
        for key in ['result', 'output', 'response']:
            if key in data and isinstance(data[key], dict):
                return self.from_structured_response(data[key])
                
        raise ValueError("No confidence value found in structured data")
    
    def from_perplexity(self, perplexity: float, scale_factor: float = 1.0) -> ConfidenceResult:
        """Convert perplexity to confidence"""
        # Lower perplexity = higher confidence
        confidence = 1.0 / (1.0 + perplexity / (10.0 * scale_factor))
        
        if perplexity < 2:
            explanation = "Low perplexity indicates high confidence"
        elif perplexity < 10:
            explanation = "Medium perplexity indicates moderate confidence"
        else:
            explanation = "High perplexity indicates low confidence"
            
        return ConfidenceResult(
            value=confidence,
            explanation=explanation,
            metadata={'method': 'perplexity', 'perplexity': perplexity}
        )
    
    def from_linguistic_markers(self, text: str) -> ConfidenceResult:
        """Extract confidence based on linguistic analysis"""
        result = self.from_response_analysis(text)
        result.metadata['method'] = 'linguistic_markers'
        return result
    
    def _calculate_consistency(self, samples: List[str]) -> float:
        """Calculate consistency score between samples"""
        if len(samples) <= 1:
            return 1.0
            
        # Simple implementation: exact match ratio
        first = samples[0]
        matches = sum(1 for s in samples if s == first)
        return matches / len(samples)
    
    def _calculate_overlap(self, samples: List[str]) -> float:
        """Calculate word overlap between samples"""
        if len(samples) <= 1:
            return 1.0
            
        # Convert to word sets
        word_sets = [set(s.lower().split()) for s in samples]
        
        # Calculate average pairwise overlap
        overlaps = []
        for i in range(len(word_sets)):
            for j in range(i + 1, len(word_sets)):
                intersection = len(word_sets[i] & word_sets[j])
                union = len(word_sets[i] | word_sets[j])
                if union > 0:
                    overlaps.append(intersection / union)
                    
        return sum(overlaps) / len(overlaps) if overlaps else 0.0
    
    def smart_extract(self, input: Any) -> ConfidenceResult:
        """Smart extraction that chooses best method"""
        if callable(input):
            result = self.from_consistency(input)
            result.metadata['method'] = 'consistency'
        elif isinstance(input, str):
            result = self.from_response_analysis(input)
            result.metadata['method'] = 'response_analysis'
        elif isinstance(input, dict) and 'confidence' in input:
            result = ConfidenceResult(value=input['confidence'], explanation="Direct extraction")
            result.metadata['method'] = 'direct'
        else:
            result = ConfidenceResult(value=0.5, explanation="Maximum uncertainty")
            result.metadata['method'] = 'default'
            
        return result