package confidence

import (
	"fmt"
	"strings"
	"time"
)

// ConfidenceValue represents a value with an associated confidence level
type ConfidenceValue struct {
	Value      interface{}
	Confidence float64
	Timestamp  time.Time
}

// ConfidenceResult represents the result of confidence extraction
type ConfidenceResult struct {
	Value       float64
	Explanation string
	Metadata    struct {
		Method               string
		Consistency          float64
		Samples              []string
		HedgingIndicators    []string
		CertaintyIndicators  []string
		UncertaintyScore     float64
	}
}

// ConsistencyOptions for consistency-based extraction
type ConsistencyOptions struct {
	Samples int
	Timeout time.Duration
}

// ConfidenceExtractor provides methods for extracting confidence from various sources
type ConfidenceExtractor struct {
	hedgingWords   []string
	certaintyWords []string
}

// NewExtractor creates a new confidence extractor
func NewExtractor() *ConfidenceExtractor {
	return &ConfidenceExtractor{
		hedgingWords:   []string{"might", "possibly", "perhaps", "maybe", "could", "not sure"},
		certaintyWords: []string{"definitely", "certain", "absolutely", "clearly", "surely"},
	}
}

// Extract extracts confidence from a given source
func (e *ConfidenceExtractor) Extract(source interface{}) (*ConfidenceResult, error) {
	if text, ok := source.(string); ok {
		return e.FromResponseAnalysis(text)
	}
	return &ConfidenceResult{Value: 0.5, Explanation: "Unknown source type"}, nil
}

// FromResponseAnalysis extracts confidence from text analysis
func (e *ConfidenceExtractor) FromResponseAnalysis(text string) (*ConfidenceResult, error) {
	lowerText := strings.ToLower(text)
	
	hedgingCount := 0
	certaintyCount := 0
	
	for _, word := range e.hedgingWords {
		if strings.Contains(lowerText, word) {
			hedgingCount++
		}
	}
	
	for _, word := range e.certaintyWords {
		if strings.Contains(lowerText, word) {
			certaintyCount++
		}
	}
	
	confidence := 0.5
	explanation := ""
	
	if certaintyCount > hedgingCount {
		confidence = 0.7 + float64(certaintyCount)*0.05
		explanation = "High confidence due to certainty markers"
	} else if hedgingCount > certaintyCount {
		confidence = 0.5 - float64(hedgingCount)*0.05
		explanation = "Low confidence due to hedging"
	} else {
		confidence = 0.5
		explanation = "Neutral confidence"
	}
	
	if confidence > 1.0 {
		confidence = 1.0
	} else if confidence < 0.0 {
		confidence = 0.0
	}
	
	result := &ConfidenceResult{
		Value:       confidence,
		Explanation: explanation,
	}
	
	if hedgingCount > 0 {
		result.Metadata.HedgingIndicators = e.hedgingWords[:hedgingCount]
	}
	if certaintyCount > 0 {
		result.Metadata.CertaintyIndicators = e.certaintyWords[:certaintyCount]
	}
	
	return result, nil
}

// FromConsistency extracts confidence from multiple samples
func (e *ConfidenceExtractor) FromConsistency(sampler func() (string, error), options ConsistencyOptions) (*ConfidenceResult, error) {
	if options.Samples == 0 {
		options.Samples = 5
	}
	
	samples := make([]string, 0, options.Samples)
	
	for i := 0; i < options.Samples; i++ {
		sample, err := sampler()
		if err != nil {
			return nil, err
		}
		samples = append(samples, sample)
	}
	
	consistency := e.calculateConsistency(samples)
	confidence := consistency // Simple mapping for now
	
	result := &ConfidenceResult{
		Value:       confidence,
		Explanation: fmt.Sprintf("Confidence based on consistency: %.2f", consistency),
	}
	result.Metadata.Method = "consistency"
	result.Metadata.Consistency = consistency
	result.Metadata.Samples = samples
	
	return result, nil
}

// calculateConsistency calculates how consistent the samples are
func (e *ConfidenceExtractor) calculateConsistency(samples []string) float64 {
	if len(samples) <= 1 {
		return 1.0
	}
	
	// Simple implementation: check if all samples are identical
	first := samples[0]
	identicalCount := 0
	
	for _, sample := range samples[1:] {
		if sample == first {
			identicalCount++
		}
	}
	
	return float64(identicalCount+1) / float64(len(samples))
}

// FromStructuredResponse extracts confidence from structured data
func (e *ConfidenceExtractor) FromStructuredResponse(data map[string]interface{}) (*ConfidenceResult, error) {
	// Check for direct confidence field
	if conf, ok := data["confidence"].(float64); ok {
		if conf > 1.0 && conf <= 100.0 {
			conf = conf / 100.0
		}
		if conf < 0.0 || conf > 1.0 {
			return nil, fmt.Errorf("invalid confidence value: %f", conf)
		}
		return &ConfidenceResult{Value: conf, Explanation: "Direct confidence value"}, nil
	}
	
	// Check nested structure
	if result, ok := data["result"].(map[string]interface{}); ok {
		if conf, ok := result["confidence"].(float64); ok {
			return &ConfidenceResult{Value: conf, Explanation: "Nested confidence value"}, nil
		}
	}
	
	return nil, fmt.Errorf("no confidence value found in structured data")
}

// FromPerplexity converts perplexity to confidence
func (e *ConfidenceExtractor) FromPerplexity(perplexity float64) (*ConfidenceResult, error) {
	// Lower perplexity = higher confidence
	confidence := 1.0 / (1.0 + perplexity/10.0)
	
	explanation := "Low perplexity indicates high confidence"
	if perplexity > 20 {
		explanation = "High perplexity indicates low confidence"
	} else if perplexity > 5 {
		explanation = "Medium perplexity indicates moderate confidence"
	}
	
	return &ConfidenceResult{
		Value:       confidence,
		Explanation: explanation,
	}, nil
}