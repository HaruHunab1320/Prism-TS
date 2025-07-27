package confidence_test

import (
	"testing"
	
	confidence "prism-confidence-go/src"
)

func TestNewExtractor(t *testing.T) {
	extractor := confidence.NewExtractor()
	if extractor == nil {
		t.Error("NewExtractor() returned nil")
	}
}

func TestConfidenceValue(t *testing.T) {
	cv := &confidence.ConfidenceValue{
		Value:      "test",
		Confidence: 0.85,
	}
	
	if cv.Value != "test" {
		t.Errorf("Expected value 'test', got %v", cv.Value)
	}
	
	if cv.Confidence != 0.85 {
		t.Errorf("Expected confidence 0.85, got %f", cv.Confidence)
	}
}