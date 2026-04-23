#!/usr/bin/env python3
"""
ConfidenceQA Dataset Generator

Generates a synthetic Q&A dataset with explicit confidence labels for
training uncertainty-aware language models.

Target: 100K samples for Phase 2 training

Categories:
- High confidence (40K): Well-established facts
- Medium confidence (30K): Subjective/contextual answers
- Low confidence (20K): Speculative/uncertain
- Very low/unknown (10K): Fundamentally unknowable
"""

import json
import random
import argparse
from pathlib import Path
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass


# ============================================================================
# Configuration
# ============================================================================

@dataclass
class ConfidenceCategory:
    name: str
    confidence_range: Tuple[float, float]
    target_samples: int
    reasoning_templates: List[str]


CATEGORIES = [
    ConfidenceCategory(
        name="high",
        confidence_range=(0.90, 0.99),
        target_samples=40000,
        reasoning_templates=[
            "Well-established fact",
            "Verifiable information",
            "Scientific consensus",
            "Mathematical truth",
            "Historical record",
            "Definitional answer",
            "Empirically verified"
        ]
    ),
    ConfidenceCategory(
        name="medium",
        confidence_range=(0.60, 0.85),
        target_samples=30000,
        reasoning_templates=[
            "Generally accepted but context-dependent",
            "Expert consensus with some debate",
            "Statistically likely but not certain",
            "Depends on specific circumstances",
            "Multiple valid interpretations exist",
            "Commonly held view with exceptions",
            "Based on current best practices"
        ]
    ),
    ConfidenceCategory(
        name="low",
        confidence_range=(0.30, 0.55),
        target_samples=20000,
        reasoning_templates=[
            "Speculative based on limited evidence",
            "Expert opinions vary significantly",
            "Emerging research area",
            "Historical interpretation subject to revision",
            "Depends on future developments",
            "Controversial topic",
            "Insufficient data for certainty"
        ]
    ),
    ConfidenceCategory(
        name="very_low",
        confidence_range=(0.05, 0.25),
        target_samples=10000,
        reasoning_templates=[
            "Fundamentally unknowable",
            "No historical record exists",
            "Subjective experience varies",
            "Future prediction with high uncertainty",
            "Philosophical question without consensus",
            "Individual preference or taste",
            "Random or chaotic system"
        ]
    )
]


# ============================================================================
# High Confidence Q&A Templates
# ============================================================================

HIGH_CONFIDENCE_QA = [
    # Geography
    {"q": "What is the capital of {country}?", "a": "{capital}", "vars": [
        {"country": "France", "capital": "Paris"},
        {"country": "Japan", "capital": "Tokyo"},
        {"country": "Brazil", "capital": "Brasília"},
        {"country": "Australia", "capital": "Canberra"},
        {"country": "Egypt", "capital": "Cairo"},
        {"country": "Germany", "capital": "Berlin"},
        {"country": "India", "capital": "New Delhi"},
        {"country": "Canada", "capital": "Ottawa"},
        {"country": "Italy", "capital": "Rome"},
        {"country": "Spain", "capital": "Madrid"},
    ]},

    # Mathematics
    {"q": "What is {a} + {b}?", "a": "{sum}", "vars": [
        {"a": str(i), "b": str(j), "sum": str(i+j)}
        for i in range(1, 20) for j in range(1, 20)
    ][:50]},

    {"q": "What is {a} × {b}?", "a": "{product}", "vars": [
        {"a": str(i), "b": str(j), "product": str(i*j)}
        for i in range(2, 12) for j in range(2, 12)
    ][:50]},

    # Science facts
    {"q": "What is the chemical symbol for {element}?", "a": "{symbol}", "vars": [
        {"element": "hydrogen", "symbol": "H"},
        {"element": "oxygen", "symbol": "O"},
        {"element": "carbon", "symbol": "C"},
        {"element": "nitrogen", "symbol": "N"},
        {"element": "gold", "symbol": "Au"},
        {"element": "silver", "symbol": "Ag"},
        {"element": "iron", "symbol": "Fe"},
        {"element": "copper", "symbol": "Cu"},
        {"element": "sodium", "symbol": "Na"},
        {"element": "potassium", "symbol": "K"},
    ]},

    {"q": "How many {unit} are in a {larger}?", "a": "{count}", "vars": [
        {"unit": "centimeters", "larger": "meter", "count": "100"},
        {"unit": "seconds", "larger": "minute", "count": "60"},
        {"unit": "minutes", "larger": "hour", "count": "60"},
        {"unit": "hours", "larger": "day", "count": "24"},
        {"unit": "days", "larger": "week", "count": "7"},
        {"unit": "months", "larger": "year", "count": "12"},
        {"unit": "millimeters", "larger": "centimeter", "count": "10"},
        {"unit": "grams", "larger": "kilogram", "count": "1000"},
    ]},

    # Historical facts
    {"q": "In what year did {event}?", "a": "{year}", "vars": [
        {"event": "World War II end", "year": "1945"},
        {"event": "the moon landing occur", "year": "1969"},
        {"event": "the Berlin Wall fall", "year": "1989"},
        {"event": "Columbus reach the Americas", "year": "1492"},
        {"event": "the French Revolution begin", "year": "1789"},
        {"event": "World War I begin", "year": "1914"},
        {"event": "the United States declare independence", "year": "1776"},
    ]},

    # Language facts
    {"q": "What language is primarily spoken in {country}?", "a": "{language}", "vars": [
        {"country": "Brazil", "language": "Portuguese"},
        {"country": "Mexico", "language": "Spanish"},
        {"country": "Germany", "language": "German"},
        {"country": "France", "language": "French"},
        {"country": "Japan", "language": "Japanese"},
        {"country": "China", "language": "Mandarin Chinese"},
        {"country": "Russia", "language": "Russian"},
        {"country": "Italy", "language": "Italian"},
    ]},

    # Literature
    {"q": "Who wrote {work}?", "a": "{author}", "vars": [
        {"work": "Romeo and Juliet", "author": "William Shakespeare"},
        {"work": "1984", "author": "George Orwell"},
        {"work": "Pride and Prejudice", "author": "Jane Austen"},
        {"work": "The Great Gatsby", "author": "F. Scott Fitzgerald"},
        {"work": "To Kill a Mockingbird", "author": "Harper Lee"},
        {"work": "Don Quixote", "author": "Miguel de Cervantes"},
    ]},

    # Technology
    {"q": "What does {acronym} stand for in computing?", "a": "{meaning}", "vars": [
        {"acronym": "CPU", "meaning": "Central Processing Unit"},
        {"acronym": "RAM", "meaning": "Random Access Memory"},
        {"acronym": "HTML", "meaning": "HyperText Markup Language"},
        {"acronym": "API", "meaning": "Application Programming Interface"},
        {"acronym": "URL", "meaning": "Uniform Resource Locator"},
        {"acronym": "SQL", "meaning": "Structured Query Language"},
    ]},
]


# ============================================================================
# Medium Confidence Q&A Templates
# ============================================================================

MEDIUM_CONFIDENCE_QA = [
    # Recommendations
    {"q": "Is {language} a good programming language for beginners?",
     "a": "{answer}", "vars": [
        {"language": "Python", "answer": "Generally yes, due to its readable syntax and gentle learning curve"},
        {"language": "JavaScript", "answer": "It can be, especially for web development, though some concepts may be tricky"},
        {"language": "Java", "answer": "It's widely used in education, though verbose syntax can be challenging"},
        {"language": "C++", "answer": "Usually not recommended for beginners due to complexity"},
        {"language": "Rust", "answer": "Typically not, as its ownership model requires understanding advanced concepts"},
    ]},

    # Best practices
    {"q": "What is the best practice for {topic}?",
     "a": "{answer}", "vars": [
        {"topic": "naming variables in code",
         "answer": "Use descriptive, meaningful names that convey purpose, though specific conventions vary by language"},
        {"topic": "handling errors in production",
         "answer": "Log errors with context, fail gracefully, and alert when appropriate, though approaches vary"},
        {"topic": "database indexing",
         "answer": "Index columns used in WHERE clauses and joins, but over-indexing can hurt write performance"},
        {"topic": "API versioning",
         "answer": "Common approaches include URL versioning or headers, each with trade-offs"},
    ]},

    # Comparisons
    {"q": "Which is better for {use_case}: {option1} or {option2}?",
     "a": "{answer}", "vars": [
        {"use_case": "building mobile apps", "option1": "React Native", "option2": "Flutter",
         "answer": "Both are capable; React Native leverages JavaScript skills, Flutter offers better performance"},
        {"use_case": "data science", "option1": "Python", "option2": "R",
         "answer": "Python is more versatile, R excels in statistical analysis; choice depends on specific needs"},
        {"use_case": "backend development", "option1": "Node.js", "option2": "Django",
         "answer": "Node.js is good for real-time apps, Django provides batteries-included approach"},
    ]},

    # Assessments
    {"q": "Is {thing} worth learning in {year}?",
     "a": "{answer}", "vars": [
        {"thing": "SQL", "year": "2024",
         "answer": "Yes, SQL remains fundamental for data work and is unlikely to become obsolete"},
        {"thing": "machine learning", "year": "2024",
         "answer": "Valuable for many roles, though the field is competitive and constantly evolving"},
        {"thing": "blockchain development", "year": "2024",
         "answer": "Depends on career goals; the space has contracted but specialized roles exist"},
    ]},

    # Performance
    {"q": "How fast is {technology} compared to alternatives?",
     "a": "{answer}", "vars": [
        {"technology": "PostgreSQL",
         "answer": "Generally performs well for most workloads; specific benchmarks depend on use case"},
        {"technology": "Python",
         "answer": "Slower than compiled languages but sufficient for most applications; can use C extensions"},
        {"technology": "MongoDB",
         "answer": "Fast for document lookups; complex queries may be slower than relational databases"},
    ]},

    # Lifestyle
    {"q": "Is {activity} good for {purpose}?",
     "a": "{answer}", "vars": [
        {"activity": "meditation", "purpose": "reducing stress",
         "answer": "Research suggests benefits for many people, though individual results vary"},
        {"activity": "drinking coffee", "purpose": "productivity",
         "answer": "Can help alertness in moderation; effects vary by individual and timing"},
        {"activity": "working remotely", "purpose": "work-life balance",
         "answer": "Can improve balance for many, though requires discipline and depends on role"},
    ]},
]


# ============================================================================
# Low Confidence Q&A Templates
# ============================================================================

LOW_CONFIDENCE_QA = [
    # Future predictions
    {"q": "Will {technology} replace {other} in the next 10 years?",
     "a": "{answer}", "vars": [
        {"technology": "AI", "other": "software developers",
         "answer": "Unlikely to fully replace, but will significantly change the profession; extent uncertain"},
        {"technology": "electric vehicles", "other": "gas cars",
         "answer": "Adoption is increasing, but timeline depends on infrastructure and policy changes"},
        {"technology": "quantum computing", "other": "classical computers",
         "answer": "For specific problems possibly, but general replacement is not expected soon"},
    ]},

    # Market predictions
    {"q": "What will happen to {market} in the next year?",
     "a": "{answer}", "vars": [
        {"market": "the stock market",
         "answer": "Impossible to predict reliably; historical trends suggest growth but with volatility"},
        {"market": "housing prices",
         "answer": "Depends on many factors including interest rates and local conditions"},
        {"market": "cryptocurrency values",
         "answer": "Highly volatile and speculative; predictions have historically been unreliable"},
    ]},

    # Emerging science
    {"q": "Does {treatment} effectively treat {condition}?",
     "a": "{answer}", "vars": [
        {"treatment": "CBD oil", "condition": "anxiety",
         "answer": "Some studies show promise, but evidence is still limited; individual response varies"},
        {"treatment": "intermittent fasting", "condition": "metabolic health",
         "answer": "Research is ongoing; may benefit some individuals but not universally recommended"},
    ]},

    # Controversial topics
    {"q": "Is {approach} the right approach to {issue}?",
     "a": "{answer}", "vars": [
        {"approach": "remote work", "issue": "company productivity",
         "answer": "Studies show mixed results; depends on company culture and role type"},
        {"approach": "microservices", "issue": "software architecture",
         "answer": "Beneficial for large teams and scaling, but adds complexity; not always the right choice"},
    ]},

    # Historical interpretation
    {"q": "What caused {historical_event}?",
     "a": "{answer}", "vars": [
        {"historical_event": "the fall of the Roman Empire",
         "answer": "Historians debate multiple factors: economic, military, political; no single cause agreed upon"},
        {"historical_event": "the Great Depression",
         "answer": "Multiple factors contributed; economists still debate relative importance of each"},
    ]},
]


# ============================================================================
# Very Low/Unknown Confidence Q&A Templates
# ============================================================================

VERY_LOW_CONFIDENCE_QA = [
    # Unknowable personal
    {"q": "What did {person} think about {topic}?",
     "a": "{answer}", "vars": [
        {"person": "Albert Einstein", "topic": "modern smartphones",
         "answer": "Unknown - Einstein died before smartphones were invented; we can only speculate"},
        {"person": "Leonardo da Vinci", "topic": "his childhood dreams",
         "answer": "No historical record exists of his childhood aspirations"},
        {"person": "Cleopatra", "topic": "her favorite food",
         "answer": "Historical records don't preserve this level of personal detail"},
    ]},

    # Philosophical
    {"q": "What is the meaning of {concept}?",
     "a": "{answer}", "vars": [
        {"concept": "life",
         "answer": "Philosophical question with no objective answer; varies by individual and culture"},
        {"concept": "consciousness",
         "answer": "Scientists and philosophers still debate the nature of consciousness"},
        {"concept": "free will",
         "answer": "Fundamental philosophical debate with no consensus across traditions"},
    ]},

    # Subjective experience
    {"q": "What does {experience} feel like?",
     "a": "{answer}", "vars": [
        {"experience": "dreaming",
         "answer": "Subjective experience varies greatly between individuals; difficult to describe objectively"},
        {"experience": "being color blind",
         "answer": "Cannot be accurately described to those without the condition"},
        {"experience": "synesthesia",
         "answer": "Unique perceptual experiences that are difficult to convey to non-synesthetes"},
    ]},

    # Random/chaotic
    {"q": "What will the lottery numbers be {when}?",
     "a": "{answer}", "vars": [
        {"when": "tomorrow",
         "answer": "Impossible to predict; lottery numbers are designed to be random"},
        {"when": "next week",
         "answer": "Cannot be predicted; truly random process"},
    ]},

    # Future individual
    {"q": "Will {person_type} be happy with {decision}?",
     "a": "{answer}", "vars": [
        {"person_type": "someone", "decision": "their career choice",
         "answer": "Impossible to predict for individuals; depends on many personal factors"},
        {"person_type": "a user", "decision": "this product",
         "answer": "Individual satisfaction varies greatly; no way to predict for specific person"},
    ]},

    # Counterfactual
    {"q": "What would have happened if {counterfactual}?",
     "a": "{answer}", "vars": [
        {"counterfactual": "the internet was never invented",
         "answer": "Purely speculative; alternative histories cannot be verified"},
        {"counterfactual": "dinosaurs hadn't gone extinct",
         "answer": "Impossible to know; evolutionary paths are unpredictable"},
    ]},
]


# ============================================================================
# Generator
# ============================================================================

def expand_template(template: Dict, vars_list: List[Dict]) -> List[Dict]:
    """Expand a template with all variable combinations"""
    results = []
    for vars_dict in vars_list:
        q = template["q"]
        a = template["a"]
        for key, value in vars_dict.items():
            q = q.replace(f"{{{key}}}", value)
            a = a.replace(f"{{{key}}}", value)
        results.append({"question": q, "answer": a})
    return results


def generate_category_samples(
    category: ConfidenceCategory,
    qa_templates: List[Dict]
) -> List[Dict]:
    """Generate samples for a confidence category"""
    samples = []

    # Expand all templates
    all_qa = []
    for template in qa_templates:
        all_qa.extend(expand_template(template, template["vars"]))

    # Generate samples up to target
    while len(samples) < category.target_samples:
        for qa in all_qa:
            if len(samples) >= category.target_samples:
                break

            conf = random.uniform(*category.confidence_range)
            reasoning = random.choice(category.reasoning_templates)

            samples.append({
                "question": qa["question"],
                "answer": qa["answer"],
                "confidence": round(conf, 2),
                "category": category.name,
                "reasoning": reasoning
            })

    return samples[:category.target_samples]


def generate_corpus(output_dir: Path) -> None:
    """Generate the full ConfidenceQA corpus"""
    output_dir.mkdir(parents=True, exist_ok=True)

    all_samples = []

    # Generate each category
    category_templates = {
        "high": HIGH_CONFIDENCE_QA,
        "medium": MEDIUM_CONFIDENCE_QA,
        "low": LOW_CONFIDENCE_QA,
        "very_low": VERY_LOW_CONFIDENCE_QA
    }

    for category in CATEGORIES:
        print(f"Generating {category.target_samples} {category.name} confidence samples...")
        templates = category_templates[category.name]
        samples = generate_category_samples(category, templates)
        all_samples.extend(samples)
        print(f"  Generated {len(samples)} samples")

    # Shuffle
    random.shuffle(all_samples)

    # Split train/val
    val_size = int(len(all_samples) * 0.05)
    train_samples = all_samples[val_size:]
    val_samples = all_samples[:val_size]

    # Save as JSONL
    train_path = output_dir / "train.jsonl"
    val_path = output_dir / "val.jsonl"

    with open(train_path, 'w') as f:
        for sample in train_samples:
            f.write(json.dumps(sample) + '\n')

    with open(val_path, 'w') as f:
        for sample in val_samples:
            f.write(json.dumps(sample) + '\n')

    # Save metadata
    metadata = {
        "total_samples": len(all_samples),
        "train_samples": len(train_samples),
        "val_samples": len(val_samples),
        "categories": {
            cat.name: {
                "target": cat.target_samples,
                "confidence_range": cat.confidence_range
            }
            for cat in CATEGORIES
        }
    }

    with open(output_dir / "metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\nGenerated:")
    print(f"  Train: {train_path} ({len(train_samples)} samples)")
    print(f"  Val: {val_path} ({len(val_samples)} samples)")
    print(f"  Metadata: {output_dir / 'metadata.json'}")

    # Print category distribution
    print("\nCategory distribution:")
    for cat in CATEGORIES:
        count = sum(1 for s in all_samples if s["category"] == cat.name)
        print(f"  {cat.name}: {count} ({100*count/len(all_samples):.1f}%)")


def main():
    parser = argparse.ArgumentParser(description="Generate ConfidenceQA dataset")
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=Path("data/confidence_qa"),
        help="Output directory"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed"
    )

    args = parser.parse_args()
    random.seed(args.seed)

    generate_corpus(args.output)


if __name__ == "__main__":
    main()
