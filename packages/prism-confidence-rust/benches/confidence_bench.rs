//! Benchmarks for prism-confidence

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use prism_confidence::prelude::*;

fn bench_pattern_matching(c: &mut Criterion) {
    let matcher = PatternMatcher::new();
    let text = "I am 85% confident in this prediction";
    
    c.bench_function("pattern_match_first", |b| {
        b.iter(|| {
            matcher.match_first(black_box(text))
        })
    });
}

fn bench_confidence_value_creation(c: &mut Criterion) {
    c.bench_function("confidence_value_new", |b| {
        b.iter(|| {
            ConfidenceValue::new(black_box("test"), black_box(0.85))
        })
    });
}

criterion_group!(benches, bench_pattern_matching, bench_confidence_value_creation);
criterion_main!(benches);