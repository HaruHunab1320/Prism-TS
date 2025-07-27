//! Error types for the confidence library

use thiserror::Error;

/// The main error type for confidence operations
#[derive(Error, Debug)]
pub enum ConfidenceError {
    #[error("Invalid confidence value: {0}. Must be between 0 and 1")]
    InvalidConfidence(f64),
    
    #[error("Extraction failed: {0}")]
    ExtractionFailed(String),
    
    #[error("Calibration error: {0}")]
    CalibrationError(String),
    
    #[error("Pattern matching failed: {0}")]
    PatternError(String),
    
    #[error("Ensemble error: {0}")]
    EnsembleError(String),
    
    #[error("Parse error: {0}")]
    ParseError(String),
}

/// Result type alias for confidence operations
pub type Result<T> = std::result::Result<T, ConfidenceError>;