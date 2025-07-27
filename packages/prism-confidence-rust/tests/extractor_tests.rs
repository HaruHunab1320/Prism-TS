use prism_confidence::{
    ConfidenceExtractor, ConfidenceValue, ConsistencyOptions, ResponseAnalysisOptions,
    Result,
};
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio;

#[test]
fn test_simple_extraction() {
    let extractor = ConfidenceExtractor::new();

    // High confidence text
    let result = extractor
        .extract("I am definitely certain that this is absolutely correct.")
        .unwrap();
    assert!(result.value > 0.65);
    assert!(result.value <= 1.0);
    assert!(result.explanation.to_lowercase().contains("certainty"));

    // Low confidence text
    let result = extractor
        .extract("This might possibly be correct, but I am not sure. It could be wrong perhaps.")
        .unwrap();
    assert!(result.value < 0.55);
    assert!(result.explanation.to_lowercase().contains("hedging"));

    // Neutral text
    let result = extractor.extract("The answer is 42.").unwrap();
    assert!(result.value >= 0.4 && result.value <= 0.7);
}

#[tokio::test]
async fn test_consistency_extraction() {
    let extractor = ConfidenceExtractor::new();

    // Test with consistent responses
    let sampler = || async { Ok("The answer is consistently 42.".to_string()) };

    let result = extractor
        .from_consistency(sampler, ConsistencyOptions::default().with_samples(5))
        .await
        .unwrap();

    assert!(result.value > 0.8);
    assert!(result.metadata.consistency.unwrap() > 0.8);
    assert_eq!(result.metadata.samples.as_ref().unwrap().len(), 5);

    // Test with inconsistent responses
    let counter = Arc::new(AtomicUsize::new(0));
    let responses = vec![
        "The answer is 42.",
        "Actually, it might be 43.",
        "No, I think it's 41.",
        "Could be anywhere from 40 to 45.",
        "I'm not sure about the answer.",
    ];

    let inconsistent_sampler = {
        let counter = counter.clone();
        let responses = responses.clone();
        move || {
            let counter = counter.clone();
            let responses = responses.clone();
            async move {
                let idx = counter.fetch_add(1, Ordering::SeqCst) % responses.len();
                Ok(responses[idx].to_string())
            }
        }
    };

    let result = extractor
        .from_consistency(inconsistent_sampler, ConsistencyOptions::default())
        .await
        .unwrap();

    assert!(result.value < 0.5);
    assert!(result.metadata.consistency.unwrap() < 0.5);
}

#[test]
fn test_response_analysis() {
    let extractor = ConfidenceExtractor::new();

    // Default analysis
    let result = extractor
        .from_response_analysis("The answer is 42.", ResponseAnalysisOptions::default())
        .unwrap();
    assert!(result.value >= 0.4 && result.value <= 0.7);

    // Custom markers
    let options = ResponseAnalysisOptions::default()
        .with_custom_markers(
            vec!["absolutely", "definitely"],
            vec!["likely", "probably"],
            vec!["maybe", "possibly", "unclear"],
        );

    let result = extractor
        .from_response_analysis("The answer is absolutely correct.", options.clone())
        .unwrap();
    assert!(result.value > 0.7);

    let result = extractor
        .from_response_analysis("The answer is possibly incorrect.", options)
        .unwrap();
    assert!(result.value < 0.5);
}

#[test]
fn test_structured_response() {
    use serde_json::json;
    let extractor = ConfidenceExtractor::new();

    // Direct confidence field
    let data = json!({
        "answer": "42",
        "confidence": 0.85
    });
    let result = extractor.from_structured_response(&data).unwrap();
    assert_eq!(result.value, 0.85);

    // Confidence as percentage
    let data = json!({
        "answer": "42",
        "confidence": 85
    });
    let result = extractor.from_structured_response(&data).unwrap();
    assert_eq!(result.value, 0.85);

    // Nested confidence
    let data = json!({
        "result": {
            "value": "42",
            "confidence": 0.75
        }
    });
    let result = extractor.from_structured_response(&data).unwrap();
    assert_eq!(result.value, 0.75);

    // Alternative field names
    let data = json!({
        "answer": "42",
        "certainty": 0.9
    });
    let result = extractor.from_structured_response(&data).unwrap();
    assert_eq!(result.value, 0.9);

    // Invalid confidence value
    let data = json!({
        "answer": "42",
        "confidence": 1.5
    });
    assert!(extractor.from_structured_response(&data).is_err());
}

#[test]
fn test_perplexity_extraction() {
    let extractor = ConfidenceExtractor::new();

    // Low perplexity = high confidence
    let result = extractor.from_perplexity(1.5, None).unwrap();
    assert!(result.value > 0.8);

    // Medium perplexity
    let result = extractor.from_perplexity(10.0, None).unwrap();
    assert!(result.value >= 0.4 && result.value <= 0.7);

    // High perplexity = low confidence
    let result = extractor.from_perplexity(50.0, None).unwrap();
    assert!(result.value < 0.3);

    // Custom scale factor
    let result1 = extractor.from_perplexity(5.0, Some(1.0)).unwrap();
    let result2 = extractor.from_perplexity(5.0, Some(2.0)).unwrap();
    assert_ne!(result1.value, result2.value);
}

#[test]
fn test_linguistic_markers() {
    let extractor = ConfidenceExtractor::new();

    // Hedging indicators
    let hedging_text = "I think this might be correct, but I'm not entirely sure. \
                       It could possibly be wrong, perhaps we should verify.";
    let result = extractor.from_linguistic_markers(hedging_text).unwrap();
    assert!(result.value < 0.5);
    assert!(result.metadata.hedging_indicators.as_ref().unwrap().len() > 3);

    // Certainty indicators
    let certain_text = "I am absolutely certain this is definitely correct. \
                       Without a doubt, this is clearly the right answer.";
    let result = extractor.from_linguistic_markers(certain_text).unwrap();
    assert!(result.value > 0.7);
    assert!(result.metadata.certainty_indicators.as_ref().unwrap().len() > 3);
}

#[test]
fn test_confidence_value_validation() {
    // Valid values
    let cv = ConfidenceValue::new(42, 0.8);
    assert_eq!(cv.value, 42);
    assert_eq!(cv.confidence, 0.8);

    // Boundary values
    let cv = ConfidenceValue::new("test", 0.0);
    assert_eq!(cv.confidence, 0.0);

    let cv = ConfidenceValue::new("test", 1.0);
    assert_eq!(cv.confidence, 1.0);

    // Values outside bounds get clamped
    let cv = ConfidenceValue::new("test", 1.5);
    assert_eq!(cv.confidence, 1.0);

    let cv = ConfidenceValue::new("test", -0.5);
    assert_eq!(cv.confidence, 0.0);
}

#[test]
fn test_calculate_consistency() {
    let extractor = ConfidenceExtractor::new();

    // Perfect consistency
    let samples = vec!["The answer is 42."; 5];
    let consistency = extractor.calculate_consistency(&samples);
    assert!(consistency > 0.95);

    // No consistency
    let samples = vec!["Answer A", "Answer B", "Answer C", "Answer D", "Answer E"];
    let consistency = extractor.calculate_consistency(&samples);
    assert!(consistency < 0.3);

    // Partial consistency
    let samples = vec!["The answer is 42.", "The answer is 42.", "Maybe 43?"];
    let consistency = extractor.calculate_consistency(&samples);
    assert!(consistency > 0.5 && consistency < 0.8);
}

#[tokio::test]
async fn test_timeout_handling() {
    let extractor = ConfidenceExtractor::new();

    // Slow sampler that takes 100ms per call
    let slow_sampler = || async {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        Ok("Slow response".to_string())
    };

    // Should timeout with 3 samples and 200ms timeout
    let options = ConsistencyOptions::default()
        .with_samples(3)
        .with_timeout(std::time::Duration::from_millis(200));

    let result = extractor.from_consistency(slow_sampler, options).await;
    assert!(result.is_err());
}

#[test]
fn test_metadata_preservation() {
    let extractor = ConfidenceExtractor::new();

    let options = ResponseAnalysisOptions::default()
        .with_check_hedging(true)
        .with_check_certainty(true)
        .with_check_specificity(true);

    let result = extractor
        .from_response_analysis("I am moderately confident.", options)
        .unwrap();

    assert!(result.metadata.method.is_some());
    assert!(result.metadata.hedging_indicators.is_some());
    assert!(result.metadata.certainty_indicators.is_some());
    assert!(result.metadata.uncertainty_score.is_some());
}

#[test]
fn test_extract_with_options() {
    use serde_json::json;
    let extractor = ConfidenceExtractor::new();

    // Test response analysis method
    let result = extractor
        .extract_with_options(
            "I am certain.",
            json!({
                "method": "response_analysis"
            }),
        )
        .unwrap();
    assert_eq!(result.metadata.method.as_ref().unwrap(), "response_analysis");

    // Test structured method
    let input = json!({
        "answer": "42",
        "confidence": 0.85
    });
    let result = extractor
        .extract_with_options(
            input,
            json!({
                "method": "structured"
            }),
        )
        .unwrap();
    assert_eq!(result.value, 0.85);
}

#[test]
fn test_smart_extract() {
    use serde_json::json;
    let extractor = ConfidenceExtractor::new();

    // String input -> response analysis
    let result = extractor.smart_extract("I am certain.").unwrap();
    assert_eq!(result.metadata.method.as_ref().unwrap(), "response_analysis");

    // Object with confidence -> direct extraction
    let input = json!({"confidence": 0.8});
    let result = extractor.smart_extract(input).unwrap();
    assert_eq!(result.value, 0.8);

    // Unknown input -> default uncertainty
    let result = extractor.smart_extract(12345).unwrap();
    assert_eq!(result.value, 0.5);
}

#[test]
fn test_confidence_result_builder() {
    let result = ConfidenceValue::new("test", 0.8)
        .with_explanation("High confidence due to certainty markers")
        .with_metadata("method", "linguistic_analysis")
        .with_metadata("marker_count", 5);

    assert_eq!(result.value, "test");
    assert_eq!(result.confidence, 0.8);
    assert!(result.explanation.contains("certainty markers"));
    assert_eq!(result.metadata.method.as_ref().unwrap(), "linguistic_analysis");
}