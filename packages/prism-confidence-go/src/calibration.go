package confidence

import (
	"time"
)

// CalibrationMethod represents different calibration algorithms
type CalibrationMethod string

const (
	PlattScaling        CalibrationMethod = "platt"
	IsotonicRegression  CalibrationMethod = "isotonic"
	BetaCalibration     CalibrationMethod = "beta"
)

// Calibrator provides methods for calibrating confidence values
type Calibrator struct {
	method CalibrationMethod
}

// NewCalibrator creates a new calibrator with the specified method
func NewCalibrator(method CalibrationMethod) *Calibrator {
	return &Calibrator{
		method: method,
	}
}

// Calibrate adjusts confidence values based on the calibration method
func (c *Calibrator) Calibrate(confidence float64) float64 {
	// Implementation to be added
	return confidence
}

// DomainCalibrator calibrates confidence based on domain
type DomainCalibrator struct {
	domain string
}

// NewDomainCalibrator creates a new domain calibrator
func NewDomainCalibrator(domain string) *DomainCalibrator {
	return &DomainCalibrator{domain: domain}
}

// Calibrate adjusts confidence based on domain context
func (d *DomainCalibrator) Calibrate(confidence float64, context map[string]interface{}) float64 {
	// Simple stub implementation
	if d.domain == "security" {
		if critical, ok := context["critical"].(bool); ok && critical {
			return confidence * 0.8 // More conservative for critical ops
		}
	}
	return confidence * 0.95
}

// SecurityCalibrator calibrates confidence for security operations
type SecurityCalibrator struct{}

// NewSecurityCalibrator creates a new security calibrator
func NewSecurityCalibrator() *SecurityCalibrator {
	return &SecurityCalibrator{}
}

// CalibrateForOperation adjusts confidence based on operation type
func (s *SecurityCalibrator) CalibrateForOperation(cv *ConfidenceValue, operation string) *ConfidenceValue {
	factor := 1.0
	switch operation {
	case "delete_user", "delete_database":
		factor = 0.5
	case "password_validation", "password_reset":
		factor = 0.7
	case "read_public_data":
		factor = 0.9
	}
	
	return &ConfidenceValue{
		Value:      cv.Value,
		Confidence: cv.Confidence * factor,
	}
}

// InteractiveCalibrator learns from feedback
type InteractiveCalibrator struct {
	observations []struct {
		predicted float64
		actual    float64
	}
}

// NewInteractiveCalibrator creates a new interactive calibrator
func NewInteractiveCalibrator() *InteractiveCalibrator {
	return &InteractiveCalibrator{}
}

// AddObservation adds a prediction/actual pair
func (i *InteractiveCalibrator) AddObservation(predicted, actual float64) {
	i.observations = append(i.observations, struct {
		predicted float64
		actual    float64
	}{predicted, actual})
}

// Calibrate adjusts based on learned patterns
func (i *InteractiveCalibrator) Calibrate(confidence float64, context map[string]interface{}) float64 {
	if len(i.observations) == 0 {
		return confidence
	}
	
	// Simple adjustment based on average overconfidence
	totalDiff := 0.0
	for _, obs := range i.observations {
		totalDiff += obs.predicted - obs.actual
	}
	avgOverconfidence := totalDiff / float64(len(i.observations))
	
	return confidence - avgOverconfidence
}

// TemporalCalibrator adjusts confidence based on time
type TemporalCalibrator struct {
	halfLife time.Duration
}

// NewTemporalCalibrator creates a new temporal calibrator
func NewTemporalCalibrator(halfLife time.Duration) *TemporalCalibrator {
	return &TemporalCalibrator{halfLife: halfLife}
}

// Calibrate adjusts confidence based on age
func (t *TemporalCalibrator) Calibrate(confidence float64, context map[string]interface{}) float64 {
	return confidence * 0.9 // Simple decay for now
}

// CalibrateWithTime adjusts confidence based on specific time
func (t *TemporalCalibrator) CalibrateWithTime(confidence float64, timestamp time.Time) float64 {
	age := time.Since(timestamp)
	halfLives := float64(age) / float64(t.halfLife)
	decay := 1.0 / float64(uint(1) << uint(halfLives)) // 2^(-halfLives)
	return confidence * decay
}

// CalibratorChain applies multiple calibrators
type CalibratorChain struct {
	calibrators []interface{}
}

// NewCalibratorChain creates a new calibrator chain
func NewCalibratorChain(calibrators ...interface{}) *CalibratorChain {
	return &CalibratorChain{calibrators: calibrators}
}

// CalibrateValue applies all calibrators to a confidence value
func (c *CalibratorChain) CalibrateValue(cv *ConfidenceValue, context map[string]interface{}) *ConfidenceValue {
	result := &ConfidenceValue{
		Value:      cv.Value,
		Confidence: cv.Confidence,
	}
	
	// Apply each calibrator
	for _, cal := range c.calibrators {
		switch c := cal.(type) {
		case *TemporalCalibrator:
			result.Confidence = c.Calibrate(result.Confidence, context)
		case *SecurityCalibrator:
			if op, ok := context["operation"].(string); ok {
				result = c.CalibrateForOperation(result, op)
			}
		}
	}
	
	return result
}