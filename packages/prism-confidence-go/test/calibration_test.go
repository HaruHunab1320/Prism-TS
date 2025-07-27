package confidence_test

import (
	"testing"
	"time"

	confidence "prism-confidence-go/src"
)

func TestDomainCalibrator(t *testing.T) {
	calibrator := confidence.NewDomainCalibrator("security")

	tests := []struct {
		name           string
		baseConfidence float64
		context        map[string]interface{}
		expectedMin    float64
		expectedMax    float64
	}{
		{
			name:           "critical security context reduces confidence",
			baseConfidence: 0.8,
			context: map[string]interface{}{
				"category": "authentication",
				"critical": true,
			},
			expectedMin: 0.5,
			expectedMax: 0.7,
		},
		{
			name:           "non-critical context maintains confidence",
			baseConfidence: 0.8,
			context: map[string]interface{}{
				"category": "logging",
				"critical": false,
			},
			expectedMin: 0.75,
			expectedMax: 0.85,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calibrator.Calibrate(tt.baseConfidence, tt.context)
			
			if result < tt.expectedMin || result > tt.expectedMax {
				t.Errorf("calibrated confidence %f not in range [%f, %f]",
					result, tt.expectedMin, tt.expectedMax)
			}
		})
	}
}

func TestSecurityCalibrator(t *testing.T) {
	calibrator := confidence.NewSecurityCalibrator()

	tests := []struct {
		name        string
		confidence  float64
		operation   string
		expected    float64
		tolerance   float64
	}{
		{
			name:       "password validation high confidence",
			confidence: 0.9,
			operation:  "password_validation",
			expected:   0.7, // Security calibrator is conservative
			tolerance:  0.1,
		},
		{
			name:       "read operation normal confidence",
			confidence: 0.8,
			operation:  "read_public_data",
			expected:   0.75,
			tolerance:  0.1,
		},
		{
			name:       "critical operation low confidence",
			confidence: 0.5,
			operation:  "delete_user",
			expected:   0.3,
			tolerance:  0.1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := confidence.ConfidenceValue{
				Value:      tt.confidence,
				Confidence: 1.0,
			}
			
			result := calibrator.CalibrateForOperation(input, tt.operation)
			
			if abs(result.Value-tt.expected) > tt.tolerance {
				t.Errorf("expected confidence ~%f (±%f), got %f",
					tt.expected, tt.tolerance, result.Value)
			}
		})
	}
}

func TestInteractiveCalibrator(t *testing.T) {
	calibrator := confidence.NewInteractiveCalibrator()

	// Train the calibrator with some examples
	trainingData := []struct {
		predicted float64
		actual    float64
	}{
		{0.8, 0.6},  // Overconfident
		{0.7, 0.5},  // Overconfident
		{0.9, 0.7},  // Overconfident
		{0.3, 0.4},  // Underconfident
		{0.2, 0.3},  // Underconfident
	}

	for _, data := range trainingData {
		calibrator.AddObservation(data.predicted, data.actual)
	}

	// Test calibration adjustment
	tests := []struct {
		name      string
		input     float64
		expected  float64
		tolerance float64
	}{
		{
			name:      "high confidence gets reduced",
			input:     0.85,
			expected:  0.65,
			tolerance: 0.15,
		},
		{
			name:      "low confidence gets increased",
			input:     0.25,
			expected:  0.35,
			tolerance: 0.15,
		},
		{
			name:      "medium confidence less affected",
			input:     0.5,
			expected:  0.5,
			tolerance: 0.1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calibrator.Calibrate(tt.input)
			
			if abs(result-tt.expected) > tt.tolerance {
				t.Errorf("expected calibrated value ~%f (±%f), got %f",
					tt.expected, tt.tolerance, result)
			}
		})
	}
}

func TestTemporalDecayCalibrator(t *testing.T) {
	now := time.Now()
	
	tests := []struct {
		name        string
		confidence  float64
		age         time.Duration
		halfLife    time.Duration
		expectedMin float64
		expectedMax float64
	}{
		{
			name:        "fresh data maintains confidence",
			confidence:  0.9,
			age:         1 * time.Hour,
			halfLife:    24 * time.Hour,
			expectedMin: 0.85,
			expectedMax: 0.95,
		},
		{
			name:        "one half-life reduces by ~50%",
			confidence:  0.8,
			age:         24 * time.Hour,
			halfLife:    24 * time.Hour,
			expectedMin: 0.35,
			expectedMax: 0.45,
		},
		{
			name:        "very old data has minimal confidence",
			confidence:  0.9,
			age:         7 * 24 * time.Hour,
			halfLife:    24 * time.Hour,
			expectedMin: 0.0,
			expectedMax: 0.1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calibrator := confidence.NewTemporalCalibrator(tt.halfLife)
			timestamp := now.Add(-tt.age)
			
			result := calibrator.Calibrate(tt.confidence, timestamp)
			
			if result < tt.expectedMin || result > tt.expectedMax {
				t.Errorf("decayed confidence %f not in range [%f, %f]",
					result, tt.expectedMin, tt.expectedMax)
			}
		})
	}
}

func TestCalibratorChain(t *testing.T) {
	// Create a chain of calibrators
	security := confidence.NewSecurityCalibrator()
	temporal := confidence.NewTemporalCalibrator(24 * time.Hour)
	
	chain := confidence.NewCalibratorChain(security, temporal)

	// Test combined calibration
	input := confidence.ConfidenceValue{
		Value:      0.9,
		Confidence: 1.0,
		Timestamp:  time.Now().Add(-12 * time.Hour), // Half a day old
	}

	result := chain.Calibrate(input, map[string]interface{}{
		"operation": "sensitive_operation",
	})

	// Should be reduced by both security (conservative) and temporal decay
	if result.Value > 0.5 {
		t.Errorf("expected heavily calibrated confidence, got %f", result.Value)
	}
}