//! Integration tests for prism-confidence

use prism_confidence::prelude::*;

#[test]
fn test_confidence_value_creation() {
    let cv = ConfidenceValue::new("test".to_string(), 0.85).unwrap();
    assert_eq!(cv.value, "test");
    assert_eq!(cv.confidence, 0.85);
}

#[test]
fn test_confidence_value_validation() {
    assert!(ConfidenceValue::new("test", 1.5).is_err());
    assert!(ConfidenceValue::new("test", -0.1).is_err());
    assert!(ConfidenceValue::new("test", 0.0).is_ok());
    assert!(ConfidenceValue::new("test", 1.0).is_ok());
}

#[test]
fn test_extractor_creation() {
    let extractor = ConfidenceExtractor::new();
    // Just ensure it can be created
    let _ = extractor;
}

#[test]
fn test_pattern_matcher_creation() {
    let matcher = PatternMatcher::new();
    assert!(matcher.pattern_count() > 0); // Should have default patterns
}