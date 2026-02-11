#!/usr/bin/env python3
"""
Generate all training datasets for the Lumina PoC.

Creates:
- Router training data (query -> domain classification)
- Specialist training data (domain-specific Q&A)
- Aggregator training data (multi-response synthesis)
"""

import json
import random
from pathlib import Path
from typing import List, Dict, Tuple
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    DATASETS_DIR, DATASET_SIZES, DOMAINS,
    PRISM_EXAMPLES, MATH_EXAMPLES, GENERAL_EXAMPLES, OOD_EXAMPLES,
    DOMAIN_KEYWORDS
)


# ============================================================================
# Prism Data Templates
# ============================================================================

PRISM_TEMPLATES = [
    # Confidence assignment
    ("How do I assign {value} with {conf}% confidence?",
     "Use the ~> operator: `const x = {value} ~> {conf_decimal}`"),

    ("What is the syntax for confident assignment?",
     "The syntax is: `expression ~> confidence_value` where confidence is 0-1."),

    ("Assign the result of {func}() with {conf}% confidence",
     "```prism\nconst result = {func}() ~> {conf_decimal}\n```"),

    # Confidence extraction
    ("How do I check the confidence of {var}?",
     "Use the extraction operator: `const conf = <~{var}`"),

    ("Get the confidence level from myValue",
     "```prism\nconst confidence = <~myValue\n```"),

    # Uncertain control flow
    ("Handle high, medium, and low confidence cases for {var}",
     "```prism\nuncertain if ({var}) {{\n  high {{ /* confident */ }}\n  medium {{ /* verify */ }}\n  low {{ /* fallback */ }}\n}}\n```"),

    ("What is uncertain if in Prism?",
     "uncertain if branches based on confidence levels: high, medium, low, and optionally default."),

    # Operators
    ("Add {a} and {b} with confidence propagation",
     "Use confident addition: `const sum = {a} ~+ {b}` - propagates minimum confidence."),

    ("What does the ~|| operator do?",
     "~|| is confident OR - selects the operand with higher confidence."),

    ("Multiply values preserving confidence",
     "Use ~* operator: `const product = a ~* b`"),

    # Pipeline
    ("Chain transformations with confidence",
     "Use ~~ for chaining: `value ~~ transform1 ~~ transform2`"),

    ("What is ~|> in Prism?",
     "~|> is the confidence pipeline operator for sequential confident transformations."),

    # Coalescing
    ("Provide fallback for low confidence values",
     "Use ~?? operator: `const safe = uncertain ~?? fallback`"),

    # Threshold
    ("Only proceed if confidence is above {conf}%",
     "Use threshold gate: `const gated = value ~@> {conf_decimal}`"),
]

MATH_TEMPLATES = [
    ("What is {a} + {b}?", "{a} + {b} = {sum}"),
    ("What is {a} - {b}?", "{a} - {b} = {diff}"),
    ("What is {a} × {b}?", "{a} × {b} = {prod}"),
    ("What is {a} ÷ {b}?", "{a} ÷ {b} = {quot}"),
    ("Calculate {a} squared", "{a}² = {squared}"),
    ("What is the square root of {perfect_square}?", "√{perfect_square} = {root}"),
    ("Solve for x: x + {a} = {total}", "x = {x_val}"),
    ("What is {percent}% of {base}?", "{percent}% of {base} = {result}"),
    ("Calculate the derivative of x^{n}", "d/dx(x^{n}) = {n}x^{n_minus_1}"),
    ("What is the integral of {n}x^{n_minus_1}?", "∫{n}x^{n_minus_1} dx = x^{n} + C"),
    ("Is {num} prime?", "{prime_answer}"),
    ("What is {a} mod {b}?", "{a} mod {b} = {mod_result}"),
]

GENERAL_TEMPLATES = [
    ("What is {topic}?", "{topic} is {definition}"),
    ("Explain {concept}", "{concept}: {explanation}"),
    ("Who invented {invention}?", "{invention} was invented by {inventor}."),
    ("When did {event} happen?", "{event} occurred in {year}."),
    ("Where is {place} located?", "{place} is located in {location}."),
    ("Define {term}", "{term}: {definition}"),
]


# ============================================================================
# Data Generation Functions
# ============================================================================

def generate_prism_sample() -> Tuple[str, str]:
    """Generate a single Prism Q&A sample."""
    template = random.choice(PRISM_TEMPLATES)
    question, answer = template

    # Fill in placeholders
    value = random.choice([42, 100, 3.14, '"hello"', "true", "getData()"])
    conf = random.randint(50, 99)
    conf_decimal = conf / 100
    var = random.choice(["result", "value", "score", "prediction", "estimate"])
    func = random.choice(["calculate", "process", "analyze", "evaluate", "predict"])
    a = random.randint(1, 100)
    b = random.randint(1, 100)

    replacements = {
        "{value}": str(value),
        "{conf}": str(conf),
        "{conf_decimal}": f"{conf_decimal:.2f}",
        "{var}": var,
        "{func}": func,
        "{a}": str(a),
        "{b}": str(b),
    }

    for key, val in replacements.items():
        question = question.replace(key, val)
        answer = answer.replace(key, val)

    return question, answer


def generate_math_sample() -> Tuple[str, str]:
    """Generate a single math Q&A sample."""
    template = random.choice(MATH_TEMPLATES)
    question, answer = template

    a = random.randint(1, 50)
    b = random.randint(1, 20)
    n = random.randint(2, 5)
    perfect_squares = [4, 9, 16, 25, 36, 49, 64, 81, 100]
    ps = random.choice(perfect_squares)
    percent = random.choice([10, 15, 20, 25, 50, 75])
    base = random.choice([100, 200, 500, 1000])
    num = random.randint(2, 50)

    replacements = {
        "{a}": str(a),
        "{b}": str(b),
        "{sum}": str(a + b),
        "{diff}": str(a - b),
        "{prod}": str(a * b),
        "{quot}": f"{a / b:.2f}" if b != 0 else "undefined",
        "{squared}": str(a * a),
        "{perfect_square}": str(ps),
        "{root}": str(int(ps ** 0.5)),
        "{total}": str(a + b),
        "{x_val}": str(b),
        "{percent}": str(percent),
        "{base}": str(base),
        "{result}": str(int(base * percent / 100)),
        "{n}": str(n),
        "{n_minus_1}": str(n - 1),
        "{num}": str(num),
        "{prime_answer}": f"{'Yes' if is_prime(num) else 'No'}, {num} is {'a prime' if is_prime(num) else 'not a prime'} number.",
        "{mod_result}": str(a % b) if b != 0 else "undefined",
    }

    for key, val in replacements.items():
        question = question.replace(key, val)
        answer = answer.replace(key, val)

    return question, answer


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True


def generate_general_sample() -> Tuple[str, str]:
    """Generate a single general knowledge Q&A sample."""
    topics = {
        "photosynthesis": ("the process by which plants convert sunlight into energy", "Photosynthesis converts light energy into chemical energy stored in glucose."),
        "gravity": ("a fundamental force that attracts objects with mass", "Gravity is the force of attraction between masses."),
        "democracy": ("a system of government where citizens vote", "Democracy is government by the people through elected representatives."),
        "ecosystem": ("a community of living organisms interacting with their environment", "Ecosystems include both biotic and abiotic components."),
        "algorithm": ("a step-by-step procedure for solving a problem", "Algorithms are finite sequences of instructions."),
    }

    inventions = {
        "the telephone": "Alexander Graham Bell",
        "the light bulb": "Thomas Edison",
        "the printing press": "Johannes Gutenberg",
        "the World Wide Web": "Tim Berners-Lee",
    }

    events = {
        "World War II end": "1945",
        "the moon landing": "1969",
        "the fall of the Berlin Wall": "1989",
    }

    places = {
        "Paris": "France",
        "Tokyo": "Japan",
        "Sydney": "Australia",
        "New York": "the United States",
    }

    choice = random.choice(["topic", "invention", "event", "place"])

    if choice == "topic":
        topic, (short_def, long_def) = random.choice(list(topics.items()))
        if random.random() > 0.5:
            return f"What is {topic}?", f"{topic.capitalize()} is {short_def}."
        else:
            return f"Explain {topic}", long_def

    elif choice == "invention":
        invention, inventor = random.choice(list(inventions.items()))
        return f"Who invented {invention}?", f"{invention.capitalize()} was invented by {inventor}."

    elif choice == "event":
        event, year = random.choice(list(events.items()))
        return f"When did {event} happen?", f"{event.capitalize()} occurred in {year}."

    else:
        place, location = random.choice(list(places.items()))
        return f"Where is {place} located?", f"{place} is located in {location}."


def generate_router_sample() -> Dict:
    """Generate a router training sample (query -> domain)."""
    domain = random.choice(DOMAINS)

    if domain == "prism":
        question, _ = generate_prism_sample()
    elif domain == "math":
        question, _ = generate_math_sample()
    else:
        question, _ = generate_general_sample()

    # 10% chance of OOD sample
    if random.random() < 0.1:
        question = random.choice(OOD_EXAMPLES)
        domain = "ood"  # Special label for out-of-distribution

    return {
        "query": question,
        "domain": domain,
        "confidence": 1.0 if domain != "ood" else 0.2,
    }


def generate_specialist_sample(domain: str) -> Dict:
    """Generate a specialist training sample."""
    if domain == "prism":
        question, answer = generate_prism_sample()
    elif domain == "math":
        question, answer = generate_math_sample()
    else:
        question, answer = generate_general_sample()

    # Include some OOD examples with low confidence labels
    is_ood = random.random() < 0.05
    if is_ood:
        question = random.choice(OOD_EXAMPLES)
        answer = "I'm not confident in answering this question."

    return {
        "question": question,
        "answer": answer,
        "confidence": {
            "overall": 0.2 if is_ood else random.uniform(0.75, 0.95),
            "epistemic": 0.7 if is_ood else random.uniform(0.05, 0.2),
            "aleatoric": random.uniform(0.02, 0.15),
            "distribution_shift": 0.8 if is_ood else random.uniform(0.01, 0.1),
        }
    }


def generate_aggregator_sample() -> Dict:
    """Generate an aggregator training sample (multiple responses -> synthesis)."""
    # Generate responses from multiple "specialists"
    question, _ = random.choice([
        generate_prism_sample(),
        generate_math_sample(),
        generate_general_sample(),
    ])

    # Simulate multiple specialist responses
    responses = []
    for i in range(random.randint(2, 4)):
        conf = random.uniform(0.3, 0.95)
        responses.append({
            "source": f"specialist_{i}",
            "answer": f"Response {i} to: {question[:50]}...",
            "confidence": conf,
        })

    # Sort by confidence
    responses.sort(key=lambda x: x["confidence"], reverse=True)

    # Synthesized answer uses highest confidence response
    best = responses[0]
    agreement = sum(1 for r in responses if r["confidence"] > 0.7) / len(responses)

    return {
        "question": question,
        "responses": responses,
        "synthesis": best["answer"],
        "final_confidence": best["confidence"] * (0.5 + 0.5 * agreement),
        "agreement_score": agreement,
    }


# ============================================================================
# Main Generation
# ============================================================================

def save_jsonl(data: List[Dict], path: Path):
    """Save data as JSONL."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w') as f:
        for item in data:
            f.write(json.dumps(item) + '\n')
    print(f"Saved {len(data)} samples to {path}")


def main():
    print("=" * 60)
    print("Generating Lumina PoC Training Data")
    print("=" * 60)

    # Router data
    print("\n[Router Data]")
    router_train = [generate_router_sample() for _ in range(DATASET_SIZES["router"].train)]
    router_val = [generate_router_sample() for _ in range(DATASET_SIZES["router"].val)]
    save_jsonl(router_train, DATASETS_DIR / "router" / "train.jsonl")
    save_jsonl(router_val, DATASETS_DIR / "router" / "val.jsonl")

    # Specialist data
    for domain in DOMAINS:
        print(f"\n[{domain.capitalize()} Specialist Data]")
        train = [generate_specialist_sample(domain) for _ in range(DATASET_SIZES[domain].train)]
        val = [generate_specialist_sample(domain) for _ in range(DATASET_SIZES[domain].val)]
        save_jsonl(train, DATASETS_DIR / f"{domain}_specialist" / "train.jsonl")
        save_jsonl(val, DATASETS_DIR / f"{domain}_specialist" / "val.jsonl")

    # Aggregator data
    print("\n[Aggregator Data]")
    agg_train = [generate_aggregator_sample() for _ in range(DATASET_SIZES["aggregator"].train)]
    agg_val = [generate_aggregator_sample() for _ in range(DATASET_SIZES["aggregator"].val)]
    save_jsonl(agg_train, DATASETS_DIR / "aggregator" / "train.jsonl")
    save_jsonl(agg_val, DATASETS_DIR / "aggregator" / "val.jsonl")

    print("\n" + "=" * 60)
    print("Data generation complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
