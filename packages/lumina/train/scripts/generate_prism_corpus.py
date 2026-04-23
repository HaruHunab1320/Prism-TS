#!/usr/bin/env python3
"""
Prism Synthetic Code Generator

Generates synthetic Prism code samples for training Lumina.
Uses template-based generation with random variations to create
diverse examples covering all Prism language features.

Target: 50K samples for Phase 3 training
"""

import json
import random
import argparse
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass
from itertools import product


# ============================================================================
# Configuration
# ============================================================================

CONFIDENCE_OPERATORS = {
    "assignment": ["~>"],
    "extraction": ["<~"],
    "chaining": ["~~"],
    "coalescing": ["~??"],
    "logical": ["~&&", "~||"],
    "arithmetic": ["~+", "~-", "~*", "~/"],
    "comparison": ["~==", "~!=", "~<", "~>", "~<=", "~>="],
    "advanced": ["~@>", "~||>", "~|>"],
}

VARIABLE_NAMES = [
    "result", "value", "data", "score", "confidence", "output",
    "prediction", "estimate", "measurement", "reading", "signal",
    "response", "status", "level", "threshold", "factor", "weight",
    "probability", "accuracy", "precision", "recall", "metric"
]

FUNCTION_NAMES = [
    "calculate", "process", "analyze", "evaluate", "predict",
    "estimate", "measure", "validate", "transform", "aggregate",
    "filter", "merge", "combine", "extract", "normalize", "calibrate"
]

DOMAIN_CONTEXTS = [
    "sensor", "api", "model", "user", "system", "network",
    "database", "cache", "queue", "stream", "pipeline", "service"
]

CONFIDENCE_VALUES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99]


# ============================================================================
# Template Classes
# ============================================================================

@dataclass
class CodeTemplate:
    """Base template for code generation"""
    name: str
    category: str
    template: str
    variables: Dict[str, List[Any]]

    def generate(self, n: int = 1) -> List[str]:
        """Generate n variations of this template"""
        results = []
        for _ in range(n):
            code = self.template
            for var, options in self.variables.items():
                code = code.replace(f"{{{var}}}", str(random.choice(options)))
            results.append(code)
        return results


# ============================================================================
# Templates: Confidence Assignment
# ============================================================================

CONFIDENCE_ASSIGNMENT_TEMPLATES = [
    CodeTemplate(
        name="simple_assignment",
        category="confidence_operators",
        template="""// Assign value with confidence
const {var} = {value} ~> {conf}
print({var})""",
        variables={
            "var": VARIABLE_NAMES,
            "value": [42, 100, 3.14, '"hello"', "true", "false"],
            "conf": CONFIDENCE_VALUES
        }
    ),

    CodeTemplate(
        name="multiple_assignments",
        category="confidence_operators",
        template="""// Multiple confident values
const {var1} = {val1} ~> {conf1}
const {var2} = {val2} ~> {conf2}
const combined = {var1} ~+ {var2}
print("Combined:", combined, "confidence:", <~combined)""",
        variables={
            "var1": VARIABLE_NAMES[:10],
            "var2": VARIABLE_NAMES[10:],
            "val1": list(range(10, 100, 10)),
            "val2": list(range(10, 100, 10)),
            "conf1": CONFIDENCE_VALUES,
            "conf2": CONFIDENCE_VALUES
        }
    ),

    CodeTemplate(
        name="sensor_reading",
        category="confidence_operators",
        template="""// {domain} reading with confidence
const {var} = get{Domain}Reading() ~> {conf}
if (<~{var} > 0.8) {{
    processTrustedData({var})
}} else {{
    flagForReview({var})
}}""",
        variables={
            "domain": DOMAIN_CONTEXTS,
            "Domain": [d.capitalize() for d in DOMAIN_CONTEXTS],
            "var": ["reading", "measurement", "signal", "data"],
            "conf": CONFIDENCE_VALUES
        }
    ),
]


# ============================================================================
# Templates: Confidence Extraction
# ============================================================================

CONFIDENCE_EXTRACTION_TEMPLATES = [
    CodeTemplate(
        name="extract_and_check",
        category="confidence_operators",
        template="""// Extract and validate confidence
const {var} = {source}()
const conf = <~{var}
if (conf < {threshold}) {{
    console.log("Low confidence warning:", conf)
}}""",
        variables={
            "var": VARIABLE_NAMES,
            "source": ["getPrediction", "getEstimate", "getMeasurement", "getReading"],
            "threshold": [0.5, 0.6, 0.7, 0.8, 0.9]
        }
    ),

    CodeTemplate(
        name="confidence_logging",
        category="confidence_operators",
        template="""// Log confidence levels
const {var1} = {func1}()
const {var2} = {func2}()
console.log("{var1} confidence:", <~{var1})
console.log("{var2} confidence:", <~{var2})
console.log("Average confidence:", (<~{var1} + <~{var2}) / 2)""",
        variables={
            "var1": VARIABLE_NAMES[:10],
            "var2": VARIABLE_NAMES[10:],
            "func1": FUNCTION_NAMES[:8],
            "func2": FUNCTION_NAMES[8:]
        }
    ),
]


# ============================================================================
# Templates: Confident Arithmetic
# ============================================================================

CONFIDENT_ARITHMETIC_TEMPLATES = [
    CodeTemplate(
        name="confident_addition",
        category="confidence_operators",
        template="""// Confident addition preserves minimum confidence
const a = {val1} ~> {conf1}
const b = {val2} ~> {conf2}
const sum = a ~+ b
print("Sum:", sum, "Confidence:", <~sum)""",
        variables={
            "val1": list(range(10, 50)),
            "val2": list(range(10, 50)),
            "conf1": CONFIDENCE_VALUES,
            "conf2": CONFIDENCE_VALUES
        }
    ),

    CodeTemplate(
        name="confident_multiplication",
        category="confidence_operators",
        template="""// Confident multiplication
const factor1 = {val1} ~> {conf1}
const factor2 = {val2} ~> {conf2}
const product = factor1 ~* factor2
print("Product:", product)""",
        variables={
            "val1": [2, 3, 4, 5, 10],
            "val2": [2, 3, 4, 5, 10],
            "conf1": CONFIDENCE_VALUES,
            "conf2": CONFIDENCE_VALUES
        }
    ),

    CodeTemplate(
        name="arithmetic_chain",
        category="confidence_operators",
        template="""// Chained confident arithmetic
const base = {base} ~> {conf1}
const adjusted = base ~+ {adj1} ~- {adj2} ~* {mult}
print("Final value:", adjusted)
print("Propagated confidence:", <~adjusted)""",
        variables={
            "base": [100, 200, 500, 1000],
            "adj1": [10, 20, 30],
            "adj2": [5, 10, 15],
            "mult": [1.1, 1.2, 0.9, 0.8],
            "conf1": CONFIDENCE_VALUES
        }
    ),
]


# ============================================================================
# Templates: Confident Comparisons
# ============================================================================

CONFIDENT_COMPARISON_TEMPLATES = [
    CodeTemplate(
        name="confident_equality",
        category="confidence_operators",
        template="""// Confident equality check
const expected = {expected}
const actual = {func}() ~> {conf}
if (actual ~== expected) {{
    console.log("Match with confidence:", <~actual)
}} else {{
    console.log("No match")
}}""",
        variables={
            "expected": [42, 100, "success", "valid"],
            "func": FUNCTION_NAMES,
            "conf": CONFIDENCE_VALUES
        }
    ),

    CodeTemplate(
        name="confident_threshold",
        category="confidence_operators",
        template="""// Threshold comparison with confidence
const {var} = {func}() ~> {conf}
const threshold = {threshold}
if ({var} ~> threshold) {{
    trigger{Action}()
}} else {{
    log("Below threshold")
}}""",
        variables={
            "var": ["score", "level", "reading", "metric"],
            "func": ["getScore", "measureLevel", "readSensor", "calculateMetric"],
            "conf": CONFIDENCE_VALUES,
            "threshold": [50, 75, 90, 100],
            "Action": ["Alert", "Action", "Process", "Notify"]
        }
    ),
]


# ============================================================================
# Templates: Uncertain Control Flow
# ============================================================================

UNCERTAIN_CONTROL_FLOW_TEMPLATES = [
    CodeTemplate(
        name="uncertain_if_basic",
        category="uncertain_control_flow",
        template="""// Uncertain if with confidence branches
const {var} = {func}()
uncertain if ({var}) {{
    high {{
        // High confidence path
        process{Domain}Confidently({var})
    }}
    medium {{
        // Medium confidence - verify first
        verify{Domain}({var})
    }}
    low {{
        // Low confidence - fallback
        use{Domain}Fallback()
    }}
}}""",
        variables={
            "var": VARIABLE_NAMES,
            "func": FUNCTION_NAMES,
            "Domain": [d.capitalize() for d in DOMAIN_CONTEXTS]
        }
    ),

    CodeTemplate(
        name="uncertain_if_with_default",
        category="uncertain_control_flow",
        template="""// Uncertain if with default branch
const prediction = {func}() ~> {conf}
uncertain if (prediction) {{
    high {{
        executePrediction(prediction)
    }}
    low {{
        requestMoreData()
    }}
    default {{
        // Handle edge cases
        logUncertainState(prediction)
    }}
}}""",
        variables={
            "func": ["predictOutcome", "estimateValue", "forecastTrend", "classifyInput"],
            "conf": CONFIDENCE_VALUES
        }
    ),

    CodeTemplate(
        name="nested_uncertain",
        category="uncertain_control_flow",
        template="""// Nested uncertain control flow
const {var1} = {func1}()
const {var2} = {func2}()

uncertain if ({var1}) {{
    high {{
        uncertain if ({var2}) {{
            high {{
                // Both high confidence
                executeWithFullConfidence({var1}, {var2})
            }}
            low {{
                // Primary confident, secondary uncertain
                executeWithPartialConfidence({var1})
            }}
        }}
    }}
    low {{
        // Primary uncertain - gather more data
        requestAdditionalInput()
    }}
}}""",
        variables={
            "var1": VARIABLE_NAMES[:10],
            "var2": VARIABLE_NAMES[10:],
            "func1": FUNCTION_NAMES[:8],
            "func2": FUNCTION_NAMES[8:]
        }
    ),
]


# ============================================================================
# Templates: Pipeline Operators
# ============================================================================

PIPELINE_TEMPLATES = [
    CodeTemplate(
        name="confidence_pipeline",
        category="pipeline_operators",
        template="""// Confidence pipeline
const result = getData()
    ~|> validate
    ~|> transform
    ~|> {finalStep}

print("Pipeline result:", result)
print("Final confidence:", <~result)""",
        variables={
            "finalStep": ["aggregate", "normalize", "calibrate", "finalize"]
        }
    ),

    CodeTemplate(
        name="parallel_confidence",
        category="pipeline_operators",
        template="""// Parallel confidence selection
const source1 = get{Domain1}Data() ~> {conf1}
const source2 = get{Domain2}Data() ~> {conf2}
const source3 = get{Domain3}Data() ~> {conf3}

// Select highest confidence source
const best = source1 ~||> source2 ~||> source3
print("Best source:", best, "confidence:", <~best)""",
        variables={
            "Domain1": ["Sensor", "Api", "Cache"],
            "Domain2": ["Model", "Database", "Stream"],
            "Domain3": ["Backup", "Fallback", "Default"],
            "conf1": CONFIDENCE_VALUES,
            "conf2": CONFIDENCE_VALUES,
            "conf3": CONFIDENCE_VALUES
        }
    ),

    CodeTemplate(
        name="threshold_gate",
        category="pipeline_operators",
        template="""// Threshold gate operator
const {var} = {func}() ~> {conf}

// Only pass if confidence > threshold
const gated = {var} ~@> {threshold}
if (gated !== null) {{
    process(gated)
}} else {{
    console.log("Confidence below threshold, rejected")
}}""",
        variables={
            "var": VARIABLE_NAMES,
            "func": FUNCTION_NAMES,
            "conf": CONFIDENCE_VALUES,
            "threshold": [0.5, 0.7, 0.8, 0.9]
        }
    ),
]


# ============================================================================
# Templates: Functions with Confidence
# ============================================================================

FUNCTION_TEMPLATES = [
    CodeTemplate(
        name="confident_function",
        category="functions",
        template="""// Function returning confident value
function {func}({param}) {{
    const result = compute({param})
    const confidence = estimateConfidence({param})
    return result ~> confidence
}}

const output = {func}({input})
print("Output:", output, "Confidence:", <~output)""",
        variables={
            "func": FUNCTION_NAMES,
            "param": ["input", "data", "value", "x"],
            "input": [42, '"test"', "[1,2,3]", "{{a: 1}}"]
        }
    ),

    CodeTemplate(
        name="async_confident",
        category="functions",
        template="""// Async function with confidence
async function fetch{Domain}Data(id) {{
    const response = await api.get(`/{domain}/${{id}}`)
    const confidence = response.reliability ~?? 0.5
    return response.data ~> confidence
}}

const data = await fetch{Domain}Data({id})
if (<~data > 0.8) {{
    cache.set(data)
}}""",
        variables={
            "Domain": [d.capitalize() for d in DOMAIN_CONTEXTS],
            "domain": DOMAIN_CONTEXTS,
            "id": [1, 42, 100, '"abc"']
        }
    ),
]


# ============================================================================
# Templates: Module Patterns
# ============================================================================

MODULE_TEMPLATES = [
    CodeTemplate(
        name="export_confident",
        category="modules",
        template="""// Module with confident exports
export const {var} = {value} ~> {conf}

export function get{Var}() {{
    return {var}
}}

export function update{Var}(newValue, newConf) {{
    {var} = newValue ~> newConf
}}""",
        variables={
            "var": ["config", "settings", "defaults", "options"],
            "Var": ["Config", "Settings", "Defaults", "Options"],
            "value": ['{{timeout: 5000}}', '{{retries: 3}}', '{{debug: false}}'],
            "conf": CONFIDENCE_VALUES
        }
    ),

    CodeTemplate(
        name="import_and_use",
        category="modules",
        template="""// Import and use confident values
import {{ {import1}, {import2} }} from './{module}'

const result = {import1}() ~+ {import2}()
print("Combined result:", result)
print("Combined confidence:", <~result)""",
        variables={
            "import1": ["getData", "getValue", "getConfig"],
            "import2": ["getMetrics", "getStatus", "getOptions"],
            "module": ["dataService", "configModule", "metricsLib"]
        }
    ),
]


# ============================================================================
# Templates: LLM Integration
# ============================================================================

LLM_INTEGRATION_TEMPLATES = [
    CodeTemplate(
        name="llm_query",
        category="llm_integration",
        template="""// LLM query with confidence
const prompt = "{prompt}"
const response = await llm.query(prompt)

uncertain if (response) {{
    high {{
        // LLM is confident in its answer
        return response.text
    }}
    medium {{
        // Ask for clarification
        const clarified = await llm.query(prompt + " Please be more specific.")
        return clarified.text
    }}
    low {{
        // Fallback to rule-based system
        return getRuleBasedAnswer(prompt)
    }}
}}""",
        variables={
            "prompt": [
                "What is the weather like?",
                "Summarize this text",
                "Translate to French",
                "Analyze the sentiment"
            ]
        }
    ),

    CodeTemplate(
        name="llm_with_context",
        category="llm_integration",
        template="""// LLM with context and confidence tracking
const context = loadContext("{domain}")
const query = "{query}"

const llmResult = await llm.generate({{
    prompt: query,
    context: context,
    temperature: {temp}
}})

const confidence = llmResult.confidence ~?? 0.5
const result = llmResult.text ~> confidence

if (<~result > {threshold}) {{
    saveToHistory(result)
}}

return result""",
        variables={
            "domain": DOMAIN_CONTEXTS,
            "query": ["Generate a summary", "Extract key points", "Classify the input"],
            "temp": [0.3, 0.5, 0.7, 0.9],
            "threshold": [0.6, 0.7, 0.8]
        }
    ),
]


# ============================================================================
# Templates: Real-World Patterns
# ============================================================================

REAL_WORLD_TEMPLATES = [
    CodeTemplate(
        name="authentication",
        category="real_world",
        template="""// Authentication with confidence scoring
async function authenticate(credentials) {{
    const passwordCheck = await verifyPassword(credentials) ~> {conf1}
    const biometricCheck = await verifyBiometric(credentials) ~> {conf2}
    const locationCheck = verifyLocation(credentials) ~> {conf3}

    // Combine confidence from multiple factors
    const authConfidence = passwordCheck ~&& biometricCheck ~&& locationCheck

    uncertain if (authConfidence) {{
        high {{
            return {{ success: true, level: "full" }}
        }}
        medium {{
            return {{ success: true, level: "limited", requireMFA: true }}
        }}
        low {{
            return {{ success: false, reason: "insufficient_confidence" }}
        }}
    }}
}}""",
        variables={
            "conf1": CONFIDENCE_VALUES,
            "conf2": CONFIDENCE_VALUES,
            "conf3": CONFIDENCE_VALUES
        }
    ),

    CodeTemplate(
        name="data_pipeline",
        category="real_world",
        template="""// Data processing pipeline with confidence
async function processData(rawData) {{
    // Stage 1: Validation
    const validated = validate(rawData) ~> {conf1}

    // Stage 2: Transformation
    const transformed = validated ~|> normalize ~|> enrich

    // Stage 3: Quality check
    const qualityScore = assessQuality(transformed)

    // Only persist high-confidence results
    if (<~transformed > {threshold}) {{
        await persist(transformed)
        return {{ status: "saved", confidence: <~transformed }}
    }} else {{
        await flagForReview(transformed)
        return {{ status: "flagged", confidence: <~transformed }}
    }}
}}""",
        variables={
            "conf1": CONFIDENCE_VALUES,
            "threshold": [0.7, 0.8, 0.9]
        }
    ),

    CodeTemplate(
        name="recommendation",
        category="real_world",
        template="""// Recommendation system with confidence
function getRecommendations(userId) {{
    const collaborative = getCollaborativeFiltering(userId) ~> {conf1}
    const contentBased = getContentBasedFiltering(userId) ~> {conf2}
    const trending = getTrendingItems() ~> {conf3}

    // Select highest confidence recommendations
    const best = collaborative ~||> contentBased ~||> trending

    // Apply threshold gate
    const filtered = best ~@> {threshold}

    return filtered ?? getDefaultRecommendations()
}}""",
        variables={
            "conf1": CONFIDENCE_VALUES,
            "conf2": CONFIDENCE_VALUES,
            "conf3": CONFIDENCE_VALUES,
            "threshold": [0.5, 0.6, 0.7]
        }
    ),
]


# ============================================================================
# Generator
# ============================================================================

ALL_TEMPLATES = (
    CONFIDENCE_ASSIGNMENT_TEMPLATES +
    CONFIDENCE_EXTRACTION_TEMPLATES +
    CONFIDENT_ARITHMETIC_TEMPLATES +
    CONFIDENT_COMPARISON_TEMPLATES +
    UNCERTAIN_CONTROL_FLOW_TEMPLATES +
    PIPELINE_TEMPLATES +
    FUNCTION_TEMPLATES +
    MODULE_TEMPLATES +
    LLM_INTEGRATION_TEMPLATES +
    REAL_WORLD_TEMPLATES
)


def generate_corpus(target_samples: int, output_dir: Path) -> None:
    """Generate the full Prism training corpus"""
    output_dir.mkdir(parents=True, exist_ok=True)

    samples = []
    samples_per_template = target_samples // len(ALL_TEMPLATES)

    print(f"Generating {target_samples} samples from {len(ALL_TEMPLATES)} templates")
    print(f"~{samples_per_template} samples per template")

    for template in ALL_TEMPLATES:
        variations = template.generate(samples_per_template)
        for code in variations:
            samples.append({
                "text": code,
                "category": template.category,
                "template": template.name
            })

    # Shuffle samples
    random.shuffle(samples)

    # Split into train/val
    val_size = int(len(samples) * 0.05)
    train_samples = samples[val_size:]
    val_samples = samples[:val_size]

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
        "total_samples": len(samples),
        "train_samples": len(train_samples),
        "val_samples": len(val_samples),
        "templates_used": len(ALL_TEMPLATES),
        "categories": list(set(t.category for t in ALL_TEMPLATES))
    }

    with open(output_dir / "metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\nGenerated:")
    print(f"  Train: {train_path} ({len(train_samples)} samples)")
    print(f"  Val: {val_path} ({len(val_samples)} samples)")
    print(f"  Metadata: {output_dir / 'metadata.json'}")


def main():
    parser = argparse.ArgumentParser(description="Generate Prism training corpus")
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=Path("data/prism_synthetic"),
        help="Output directory"
    )
    parser.add_argument(
        "--samples", "-n",
        type=int,
        default=50000,
        help="Target number of samples"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed"
    )

    args = parser.parse_args()
    random.seed(args.seed)

    generate_corpus(args.samples, args.output)


if __name__ == "__main__":
    main()
