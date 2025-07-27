//! Ensemble methods for combining confidence values

use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::error::{ConfidenceError, Result};
use crate::extractor::ConfidenceValue;

/// Available ensemble methods
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EnsembleMethod {
    /// Simple arithmetic mean
    Mean,
    /// Weighted mean with custom weights
    WeightedMean,
    /// Median value
    Median,
    /// Maximum confidence
    Max,
    /// Minimum confidence
    Min,
    /// Harmonic mean
    HarmonicMean,
}

/// Combine multiple confidence values using ensemble methods
pub fn ensemble_combine<T>(
    values: &[ConfidenceValue<T>],
    method: EnsembleMethod,
    weights: Option<&[f64]>,
) -> Result<ConfidenceValue>
where
    T: Clone + Serialize,
{
    if values.is_empty() {
        return Err(ConfidenceError::EnsembleError(
            "Cannot combine empty list of values".to_string()
        ));
    }
    
    let confidences: Vec<f64> = values.iter().map(|v| v.confidence).collect();
    
    let combined_confidence = match method {
        EnsembleMethod::Mean => {
            confidences.iter().sum::<f64>() / confidences.len() as f64
        }
        EnsembleMethod::WeightedMean => {
            let weights = weights.ok_or_else(|| {
                ConfidenceError::EnsembleError("Weights required for weighted mean".to_string())
            })?;
            
            if weights.len() != confidences.len() {
                return Err(ConfidenceError::EnsembleError(
                    "Weights must have same length as values".to_string()
                ));
            }
            
            let sum_weights: f64 = weights.iter().sum();
            if sum_weights == 0.0 {
                return Err(ConfidenceError::EnsembleError(
                    "Sum of weights cannot be zero".to_string()
                ));
            }
            
            confidences.iter()
                .zip(weights.iter())
                .map(|(c, w)| c * w)
                .sum::<f64>() / sum_weights
        }
        EnsembleMethod::Median => {
            let mut sorted = confidences.clone();
            sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
            let mid = sorted.len() / 2;
            
            if sorted.len() % 2 == 0 {
                (sorted[mid - 1] + sorted[mid]) / 2.0
            } else {
                sorted[mid]
            }
        }
        EnsembleMethod::Max => {
            *confidences.iter()
                .max_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap()
        }
        EnsembleMethod::Min => {
            *confidences.iter()
                .min_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap()
        }
        EnsembleMethod::HarmonicMean => {
            let non_zero: Vec<f64> = confidences.into_iter()
                .filter(|&c| c > 0.0)
                .collect();
            
            if non_zero.is_empty() {
                0.0
            } else {
                non_zero.len() as f64 / non_zero.iter().map(|c| 1.0 / c).sum::<f64>()
            }
        }
    };
    
    // Create a JSON representation of the combined value
    let combined_value = json!({
        "ensemble_method": method,
        "num_sources": values.len(),
        "source_values": values.iter().map(|v| &v.value).collect::<Vec<_>>(),
    });
    
    ConfidenceValue::new(combined_value, combined_confidence)
}