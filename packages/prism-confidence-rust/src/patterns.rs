//! Pattern matching for confidence extraction

use regex::Regex;
use std::sync::Arc;

use crate::error::{ConfidenceError, Result};
use crate::extractor::ConfidenceValue;

/// Function type for transforming regex matches to confidence values
pub type TransformFn = Arc<dyn Fn(&regex::Captures) -> Result<f64> + Send + Sync>;

/// Represents a confidence extraction pattern
#[derive(Clone)]
pub struct Pattern {
    pub name: String,
    pub regex: Regex,
    pub transformer: TransformFn,
}

impl Pattern {
    /// Create a new pattern
    pub fn new<F>(name: impl Into<String>, regex: &str, transformer: F) -> Result<Self>
    where
        F: Fn(&regex::Captures) -> Result<f64> + Send + Sync + 'static,
    {
        let regex = Regex::new(regex)
            .map_err(|e| ConfidenceError::PatternError(format!("Invalid regex: {}", e)))?;
        
        Ok(Self {
            name: name.into(),
            regex,
            transformer: Arc::new(transformer),
        })
    }
    
    /// Attempt to match the pattern against text
    pub fn match_text(&self, text: &str) -> Option<ConfidenceValue<String>> {
        self.regex.captures(text).and_then(|caps| {
            match (self.transformer)(&caps) {
                Ok(confidence) => {
                    let matched = caps.get(0).unwrap().as_str().to_string();
                    ConfidenceValue::new(matched, confidence).ok()
                }
                Err(_) => None,
            }
        })
    }
}

/// Manages pattern-based confidence extraction
#[derive(Default)]
pub struct PatternMatcher {
    patterns: Vec<Pattern>,
}

impl PatternMatcher {
    /// Create a new pattern matcher
    pub fn new() -> Self {
        let mut matcher = Self::default();
        matcher.init_default_patterns();
        matcher
    }
    
    /// Initialize default confidence patterns
    fn init_default_patterns(&mut self) {
        // Percentage pattern: "90% confident", "85% sure", etc.
        let _ = self.add_pattern(
            "percentage",
            r"(\d+(?:\.\d+)?)\s*%\s*(?:confident|sure|certain)",
            |caps| {
                caps.get(1)
                    .and_then(|m| m.as_str().parse::<f64>().ok())
                    .map(|v| v / 100.0)
                    .ok_or_else(|| ConfidenceError::ParseError("Invalid percentage".to_string()))
            },
        );
        
        // Decimal pattern: "0.95 confidence", "confidence: 0.8", etc.
        let _ = self.add_pattern(
            "decimal",
            r"(?:confidence|certainty)[\s:]+([01]\.?\d*)",
            |caps| {
                caps.get(1)
                    .and_then(|m| m.as_str().parse::<f64>().ok())
                    .ok_or_else(|| ConfidenceError::ParseError("Invalid decimal".to_string()))
            },
        );
        
        // Word pattern: "highly confident", "somewhat sure", etc.
        let _ = self.add_pattern(
            "words",
            r"(very low|low|somewhat|moderate|high|very high|extremely)\s+(?:confident|sure|certain)",
            |caps| {
                caps.get(1)
                    .map(|m| match m.as_str() {
                        "very low" => 0.1,
                        "low" => 0.3,
                        "somewhat" => 0.5,
                        "moderate" => 0.6,
                        "high" => 0.8,
                        "very high" => 0.95,
                        "extremely" => 0.99,
                        _ => 0.5,
                    })
                    .ok_or_else(|| ConfidenceError::ParseError("Invalid word pattern".to_string()))
            },
        );
    }
    
    /// Add a new pattern to the matcher
    pub fn add_pattern<F>(&mut self, name: impl Into<String>, regex: &str, transformer: F) -> Result<()>
    where
        F: Fn(&regex::Captures) -> Result<f64> + Send + Sync + 'static,
    {
        let pattern = Pattern::new(name, regex, transformer)?;
        self.patterns.push(pattern);
        Ok(())
    }
    
    /// Match text against all patterns, returning the first match
    pub fn match_first(&self, text: &str) -> Option<ConfidenceValue<String>> {
        self.patterns.iter()
            .find_map(|pattern| pattern.match_text(text))
    }
    
    /// Find all matching patterns in text
    pub fn match_all(&self, text: &str) -> Vec<ConfidenceValue<String>> {
        self.patterns.iter()
            .filter_map(|pattern| pattern.match_text(text))
            .collect()
    }
    
    /// Get the number of registered patterns
    pub fn pattern_count(&self) -> usize {
        self.patterns.len()
    }
}