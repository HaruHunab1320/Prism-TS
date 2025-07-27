//! Prism Confidence - Rust implementation
//! 
//! This crate provides confidence extraction and calibration capabilities
//! for the Prism language ecosystem.

mod calibration;
mod ensemble;
mod error;
mod extractor;
mod patterns;

pub use calibration::{CalibrationMethod, Calibrator};
pub use ensemble::{ensemble_combine, EnsembleMethod};
pub use error::{ConfidenceError, Result};
pub use extractor::{ConfidenceExtractor, ConfidenceValue};
pub use patterns::{Pattern, PatternMatcher};

/// Re-export commonly used items
pub mod prelude {
    pub use crate::{
        CalibrationMethod, Calibrator, ConfidenceExtractor, ConfidenceValue,
        EnsembleMethod, Pattern, PatternMatcher, Result,
    };
}