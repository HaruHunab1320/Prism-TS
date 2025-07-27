package confidence_test

import (
	"testing"
	"time"

	confidence "prism-confidence-go/src"
)

func TestConfidenceExtractor_SimpleExtraction(t *testing.T) {
	extractor := confidence.NewExtractor()

	tests := []struct {
		name     string
		input    string
		minConf  float64
		maxConf  float64
		contains string
	}{
		{
			name:     "high confidence from certainty markers",
			input:    "I am definitely certain that this is absolutely correct.",
			minConf:  0.65,
			maxConf:  1.0,
			contains: "certainty",
		},
		{
			name:     "low confidence from hedging",
			input:    "This might possibly be correct, but I am not sure. It could be wrong perhaps.",
			minConf:  0.0,
			maxConf:  0.55,
			contains: "hedging",
		},
		{
			name:     "medium confidence from neutral response",
			input:    "The answer is 42.",
			minConf:  0.4,
			maxConf:  0.7,
			contains: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractor.Extract(tt.input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if result.Value < tt.minConf || result.Value > tt.maxConf {
				t.Errorf("confidence %f not in range [%f, %f]", result.Value, tt.minConf, tt.maxConf)
			}

			if tt.contains != "" && !containsString(result.Explanation, tt.contains) {
				t.Errorf("explanation should contain '%s', got: %s", tt.contains, result.Explanation)
			}
		})
	}
}

func TestConfidenceExtractor_FromConsistency(t *testing.T) {
	extractor := confidence.NewExtractor()

	// Test with consistent responses
	t.Run("high consistency", func(t *testing.T) {
		sampler := func() (string, error) {
			return "The answer is consistently 42.", nil
		}

		result, err := extractor.FromConsistency(sampler, confidence.ConsistencyOptions{
			Samples: 5,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Value < 0.8 {
			t.Errorf("expected high confidence from consistent responses, got %f", result.Value)
		}

		if result.Metadata.Consistency < 0.8 {
			t.Errorf("expected high consistency score, got %f", result.Metadata.Consistency)
		}
	})

	// Test with inconsistent responses
	t.Run("low consistency", func(t *testing.T) {
		counter := 0
		responses := []string{
			"The answer is 42.",
			"Actually, it might be 43.",
			"No, I think it's 41.",
			"Could be anywhere from 40 to 45.",
			"I'm not sure about the answer.",
		}

		sampler := func() (string, error) {
			response := responses[counter%len(responses)]
			counter++
			return response, nil
		}

		result, err := extractor.FromConsistency(sampler, confidence.ConsistencyOptions{
			Samples: 5,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Value > 0.5 {
			t.Errorf("expected low confidence from inconsistent responses, got %f", result.Value)
		}
	})
}

func TestConfidenceExtractor_StructuredResponse(t *testing.T) {
	extractor := confidence.NewExtractor()

	tests := []struct {
		name         string
		input        map[string]interface{}
		expectedConf float64
		expectError  bool
	}{
		{
			name: "explicit confidence field",
			input: map[string]interface{}{
				"answer":     "42",
				"confidence": 0.85,
			},
			expectedConf: 0.85,
		},
		{
			name: "confidence as percentage",
			input: map[string]interface{}{
				"answer":     "42",
				"confidence": 85,
			},
			expectedConf: 0.85,
		},
		{
			name: "confidence in nested structure",
			input: map[string]interface{}{
				"result": map[string]interface{}{
					"value":      "42",
					"confidence": 0.75,
				},
			},
			expectedConf: 0.75,
		},
		{
			name: "invalid confidence value",
			input: map[string]interface{}{
				"answer":     "42",
				"confidence": 150,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractor.FromStructuredResponse(tt.input)
			
			if tt.expectError {
				if err == nil {
					t.Error("expected error but got none")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if abs(result.Value-tt.expectedConf) > 0.001 {
				t.Errorf("expected confidence %f, got %f", tt.expectedConf, result.Value)
			}
		})
	}
}

func TestConfidenceExtractor_Perplexity(t *testing.T) {
	extractor := confidence.NewExtractor()

	tests := []struct {
		name        string
		perplexity  float64
		expectedMin float64
		expectedMax float64
	}{
		{
			name:        "low perplexity high confidence",
			perplexity:  1.5,
			expectedMin: 0.8,
			expectedMax: 1.0,
		},
		{
			name:        "medium perplexity",
			perplexity:  10.0,
			expectedMin: 0.4,
			expectedMax: 0.7,
		},
		{
			name:        "high perplexity low confidence",
			perplexity:  50.0,
			expectedMin: 0.0,
			expectedMax: 0.3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractor.FromPerplexity(tt.perplexity)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if result.Value < tt.expectedMin || result.Value > tt.expectedMax {
				t.Errorf("confidence %f not in expected range [%f, %f]", 
					result.Value, tt.expectedMin, tt.expectedMax)
			}
		})
	}
}

func TestConfidenceExtractor_WithTimeout(t *testing.T) {
	extractor := confidence.NewExtractor()

	// Test timeout handling
	slowSampler := func() (string, error) {
		time.Sleep(100 * time.Millisecond)
		return "Slow response", nil
	}

	result, err := extractor.FromConsistency(slowSampler, &confidence.ConsistencyOptions{
		Samples: 3,
		Timeout: 200 * time.Millisecond, // Should timeout after 2 samples
	})

	if err == nil {
		t.Error("expected timeout error")
	}

	if result != nil {
		t.Error("expected nil result on timeout")
	}
}

// Helper functions
func containsString(s, substr string) bool {
	return len(substr) > 0 && len(s) >= len(substr) && 
		(s == substr || len(s) > len(substr) && containsSubstring(s, substr))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}