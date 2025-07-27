use prism_confidence::{
    Calibrator, CalibratorChain, ConfidenceValue, DomainCalibrator, 
    InteractiveCalibrator, SecurityCalibrator, TemporalCalibrator,
    CalibrationCurve, Result,
};
use std::collections::HashMap;
use std::time::{Duration, SystemTime};

#[test]
fn test_domain_calibrator() {
    let mut calibrator = DomainCalibrator::new("security");

    // Test security domain calibration
    let mut context = HashMap::new();
    context.insert("category".to_string(), "authentication".into());
    context.insert("critical".to_string(), true.into());

    let result = calibrator.calibrate(0.8, Some(&context));
    assert!(result < 0.7); // Conservative for critical operations

    // Non-critical operations
    context.insert("category".to_string(), "logging".into());
    context.insert("critical".to_string(), false.into());

    let result = calibrator.calibrate(0.8, Some(&context));
    assert!(result >= 0.75 && result <= 0.85);
}

#[test]
fn test_security_calibrator() {
    let calibrator = SecurityCalibrator::new();

    // Test different operation types
    let cv = ConfidenceValue::new("result", 0.9);

    // Critical operations should heavily reduce confidence
    let result = calibrator.calibrate_for_operation(&cv, "delete_user");
    assert!(result.confidence < 0.5);

    let result = calibrator.calibrate_for_operation(&cv, "password_validation");
    assert!(result.confidence < 0.7);

    // Read operations should be less conservative
    let result = calibrator.calibrate_for_operation(&cv, "read_public_data");
    assert!(result.confidence > 0.7);

    // Very low confidence should stay low
    let cv_low = ConfidenceValue::new("result", 0.2);
    let result = calibrator.calibrate_for_operation(&cv_low, "any_operation");
    assert!(result.confidence <= 0.2);
}

#[test]
fn test_interactive_calibrator() {
    let mut calibrator = InteractiveCalibrator::new();

    // Initial calibration (no training data)
    let initial = calibrator.calibrate(0.8, None);
    assert!((initial - 0.8).abs() < 0.1);

    // Add observations showing overconfidence
    for _ in 0..10 {
        calibrator.add_observation(0.8, 0.6);
        calibrator.add_observation(0.9, 0.7);
    }

    // Should now reduce high confidence values
    let adjusted = calibrator.calibrate(0.8, None);
    assert!(adjusted < 0.7);

    // Test monotonicity
    let values = vec![0.2, 0.4, 0.6, 0.8];
    let calibrated: Vec<f64> = values.iter().map(|&v| calibrator.calibrate(v, None)).collect();

    // Check monotonic increasing
    for i in 0..calibrated.len() - 1 {
        assert!(calibrated[i] <= calibrated[i + 1]);
    }
}

#[test]
fn test_temporal_calibrator() {
    let calibrator = TemporalCalibrator::new(Duration::from_secs(86400)); // 1 day half-life
    let now = SystemTime::now();

    // Fresh data
    let result = calibrator.calibrate_with_time(0.9, now);
    assert!(result > 0.85);

    // One half-life old
    let old_time = now - Duration::from_secs(86400);
    let result = calibrator.calibrate_with_time(0.9, old_time);
    assert!(result > 0.4 && result < 0.5); // ~0.45

    // Two half-lives old
    let very_old_time = now - Duration::from_secs(2 * 86400);
    let result = calibrator.calibrate_with_time(0.9, very_old_time);
    assert!(result > 0.2 && result < 0.25); // ~0.225

    // Test with ConfidenceValue
    let cv = ConfidenceValue::new("data", 0.8).with_timestamp(old_time);
    let result = calibrator.calibrate(cv.confidence, Some(&HashMap::new()));
    assert!(result < 0.8); // Should be decayed
}

#[test]
fn test_temporal_calibrator_with_minimum() {
    let calibrator = TemporalCalibrator::new(Duration::from_secs(3600)) // 1 hour half-life
        .with_minimum_confidence(0.1);

    let very_old_time = SystemTime::now() - Duration::from_secs(30 * 86400); // 30 days
    let result = calibrator.calibrate_with_time(0.9, very_old_time);
    assert!(result >= 0.1); // Should not go below minimum
}

#[test]
fn test_calibrator_chain() {
    let temporal = Box::new(TemporalCalibrator::new(Duration::from_secs(86400)));
    let security = Box::new(SecurityCalibrator::new());

    let chain = CalibratorChain::new(vec![temporal, security]);

    // Test with old, security-critical data
    let cv = ConfidenceValue::new("sensitive_data", 0.9)
        .with_timestamp(SystemTime::now() - Duration::from_secs(86400));

    let mut context = HashMap::new();
    context.insert("operation".to_string(), "delete_database".into());

    let result = chain.calibrate_value(&cv, Some(&context));

    // Should be heavily reduced by both calibrators
    assert!(result.confidence < 0.3);
}

#[test]
fn test_empty_calibrator_chain() {
    let chain = CalibratorChain::new(vec![]);
    let cv = ConfidenceValue::new("test", 0.8);
    let result = chain.calibrate_value(&cv, None);
    assert_eq!(result.confidence, 0.8);
}

#[test]
fn test_custom_calibration_curves() {
    let mut curves = HashMap::new();
    curves.insert(
        "test_category".to_string(),
        CalibrationCurve {
            base_confidence: 0.5,
            adjustments: vec![
                ("high_risk".to_string(), -0.3),
                ("low_risk".to_string(), 0.1),
            ]
            .into_iter()
            .collect(),
        },
    );

    let mut calibrator = DomainCalibrator::with_curves("custom", curves);

    let mut context = HashMap::new();
    context.insert("category".to_string(), "test_category".into());
    context.insert("risk".to_string(), "high_risk".into());

    let result = calibrator.calibrate(0.8, Some(&context));
    assert!((result - 0.5).abs() < 0.1); // ~0.5 after adjustment
}

#[test]
fn test_calibration_metrics() {
    use prism_confidence::calibration::{calculate_ece, get_reliability_diagram_data};

    // Perfect calibration
    let predictions = vec![0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    let actuals = predictions.clone();
    let ece = calculate_ece(&predictions, &actuals, 10);
    assert!(ece < 0.01);

    // Systematic overconfidence
    let predictions = vec![0.2, 0.4, 0.6, 0.8, 0.9];
    let actuals = vec![0.1, 0.2, 0.3, 0.4, 0.5];
    let ece = calculate_ece(&predictions, &actuals, 5);
    assert!(ece > 0.2);

    // Reliability diagram data
    let diagram_data = get_reliability_diagram_data(&predictions, &actuals, 5);
    assert!(!diagram_data.is_empty());
    for bin in &diagram_data {
        assert!(bin.confidence >= 0.0 && bin.confidence <= 1.0);
        assert!(bin.accuracy >= 0.0 && bin.accuracy <= 1.0);
    }
}

#[test]
fn test_platt_scaling_calibrator() {
    let mut calibrator = InteractiveCalibrator::with_method("platt");

    // Add training data simulating systematic overconfidence
    use rand::{Rng, SeedableRng};
    use rand::rngs::StdRng;
    
    let mut rng = StdRng::seed_from_u64(42);
    
    for _ in 0..100 {
        let pred: f64 = rng.gen();
        let actual = (pred * 0.8 + rng.gen_range(-0.05..0.05)).clamp(0.0, 1.0);
        calibrator.add_observation(pred, actual);
    }

    // Test calibration reduces overconfidence
    let test_values = vec![0.6, 0.7, 0.8, 0.9];
    for val in test_values {
        let calibrated = calibrator.calibrate(val, None);
        assert!(calibrated < val); // Should reduce confidence
    }
}

#[test]
fn test_calibrator_with_context() {
    struct ContextAwareCalibrator;

    impl Calibrator for ContextAwareCalibrator {
        fn calibrate(&mut self, confidence: f64, context: Option<&HashMap<String, serde_json::Value>>) -> f64 {
            if let Some(ctx) = context {
                if let Some(severity) = ctx.get("severity") {
                    if severity == "high" {
                        return confidence * 0.5;
                    }
                }
            }
            confidence
        }
    }

    let mut calibrator = ContextAwareCalibrator;
    
    // Without context
    assert_eq!(calibrator.calibrate(0.8, None), 0.8);

    // With high severity context
    let mut context = HashMap::new();
    context.insert("severity".to_string(), "high".into());
    assert_eq!(calibrator.calibrate(0.8, Some(&context)), 0.4);
}