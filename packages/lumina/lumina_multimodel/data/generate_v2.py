#!/usr/bin/env python3
"""
Lumina PoC v2 Data Generation

Improvements:
- More diverse training examples
- Better OOD coverage for calibration
- Proper confidence label distribution
- Multiple difficulty levels
"""

import json
import random
import math
from pathlib import Path
from typing import List, Dict, Tuple
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from config_v2 import (
    DATASETS_DIR, DATASET_CONFIG, DOMAINS,
    PRISM_PATTERNS, MATH_PATTERNS, CODE_PATTERNS, OOD_EXAMPLES
)


# ============================================================================
# Prism Data Generation
# ============================================================================

def generate_prism_examples(n: int) -> List[Dict]:
    """Generate diverse Prism Q&A examples with high cardinality."""
    examples = []

    # Large variable pools for diversity
    values = (
        list(range(-100, 101)) +  # integers
        [round(x * 0.1, 1) for x in range(-100, 101)] +  # floats
        [f'"{w}"' for w in ["hello", "world", "test", "data", "result", "value", "item", "name", "key", "msg"]] +
        ["true", "false", "null"] +
        [f"get{n}()" for n in ["Data", "Value", "Result", "Score", "Status", "Config", "User", "Item"]] +
        [f"{o}.{p}" for o in ["user", "data", "config", "response", "state", "ctx"]
         for p in ["value", "score", "status", "id", "name", "count"]]
    )

    confidences = list(range(1, 100))  # 1-99%

    var_names = [
        "result", "value", "score", "prediction", "estimate", "output", "response",
        "status", "data", "item", "count", "total", "sum", "avg", "max", "min",
        "x", "y", "z", "a", "b", "c", "temp", "ret", "res", "val", "num",
        "userScore", "itemCount", "totalValue", "avgPrice", "maxTemp", "minValue",
        "predictionResult", "estimatedValue", "calculatedScore", "processedData"
    ]

    func_names = [
        "calculate", "process", "analyze", "evaluate", "predict", "estimate",
        "measure", "validate", "transform", "aggregate", "compute", "fetch",
        "load", "save", "update", "check", "verify", "parse", "format", "convert",
        "getData", "getValue", "getScore", "getResult", "getStatus", "getConfig"
    ]

    operators = ["~>", "<~", "~+", "~-", "~*", "~/", "~==", "~!=", "~<", "~>",
                 "~<=", "~>=", "~&&", "~||", "~??", "~|>", "~@>", "~||>"]

    # Dynamic template generators for high diversity
    def gen_assignment():
        var = random.choice(var_names)
        val = random.choice(values)
        conf = random.choice(confidences)
        q = random.choice([
            f"How do I assign {val} to {var} with {conf}% confidence?",
            f"Assign the value {val} to variable {var} with confidence {conf}%",
            f"Create a confident value {var} = {val} at {conf}% certainty",
            f"Write Prism code to store {val} in {var} with {conf}% confidence",
            f"What's the syntax for {var} = {val} with {conf}% confidence in Prism?",
        ])
        a = f"```prism\nconst {var} = {val} ~> {conf/100:.2f}\n```"
        return q, a, "confidence_assignment"

    def gen_extraction():
        var = random.choice(var_names)
        q = random.choice([
            f"How do I get the confidence of {var}?",
            f"Extract the confidence value from {var}",
            f"What's the confidence level of {var}?",
            f"Read the confidence from variable {var}",
            f"How to check confidence of {var} in Prism?",
        ])
        a = f"```prism\nconst conf = <~{var}\n```\nThis extracts the confidence score (0-1) from {var}."
        return q, a, "confidence_extraction"

    def gen_operator():
        op = random.choice(operators)
        var1, var2 = random.sample(var_names, 2)
        op_descriptions = {
            "~>": "confidence assignment",
            "<~": "confidence extraction",
            "~+": "confident addition (propagates min confidence)",
            "~-": "confident subtraction",
            "~*": "confident multiplication",
            "~/": "confident division",
            "~==": "confident equality check",
            "~!=": "confident inequality check",
            "~<": "confident less-than",
            "~<=": "confident less-or-equal",
            "~>=": "confident greater-or-equal",
            "~&&": "confident AND (both must be confident)",
            "~||": "confident OR (selects higher confidence)",
            "~??": "confidence coalescing (fallback if low confidence)",
            "~|>": "confidence pipeline (chains transformations)",
            "~@>": "threshold gate (passes only if confidence above threshold)",
            "~||>": "parallel confidence (selects highest confidence result)",
        }
        desc = op_descriptions.get(op, "confident operator")
        q = random.choice([
            f"What does {op} do in Prism?",
            f"Explain the {op} operator",
            f"How do I use {op} in Prism?",
            f"What is {op} for in Prism?",
        ])
        a = f"The `{op}` operator performs {desc}. Example:\n```prism\nconst result = {var1} {op} {var2}\n```"
        return q, a, "operators"

    def gen_uncertain_if():
        var = random.choice(var_names)
        action_high = random.choice(["execute", "process", "accept", "commit", "apply"])
        action_low = random.choice(["reject", "retry", "fallback", "defer", "warn"])
        q = random.choice([
            f"How do I handle different confidence levels for {var}?",
            f"Branch based on confidence of {var}",
            f"Write uncertain if for {var}",
            f"Handle high/medium/low confidence cases for {var}",
        ])
        a = f"""```prism
uncertain if ({var}) {{
  high {{ {action_high}({var}) }}
  medium {{ verify({var}) }}
  low {{ {action_low}() }}
}}
```"""
        return q, a, "uncertain_control_flow"

    def gen_threshold():
        var = random.choice(var_names)
        threshold = random.choice([0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95])
        q = random.choice([
            f"Only use {var} if confidence is above {threshold}",
            f"Gate {var} at {int(threshold*100)}% confidence",
            f"How to require {int(threshold*100)}% confidence for {var}?",
        ])
        a = f"```prism\nconst gated = {var} ~@> {threshold}\n// gated is null if confidence < {threshold}\n```"
        return q, a, "threshold"

    def gen_pipeline():
        var = random.choice(var_names)
        funcs = random.sample(func_names, 3)
        q = random.choice([
            f"Chain {funcs[0]}, {funcs[1]}, {funcs[2]} while tracking confidence",
            f"Pipeline {var} through multiple transformations with confidence",
            f"How to compose confident functions in Prism?",
        ])
        a = f"```prism\nconst result = {var} ~|> {funcs[0]} ~|> {funcs[1]} ~|> {funcs[2]}\n// Confidence propagates through the pipeline\n```"
        return q, a, "pipeline"

    def gen_coalesce():
        var1, var2 = random.sample(var_names, 2)
        q = random.choice([
            f"Use {var2} as fallback if {var1} has low confidence",
            f"Coalesce {var1} with {var2} based on confidence",
            f"How to provide a confident fallback in Prism?",
        ])
        a = f"```prism\nconst safe = {var1} ~?? {var2}\n// Uses {var2} if {var1}'s confidence is too low\n```"
        return q, a, "coalesce"

    generators = [
        gen_assignment, gen_extraction, gen_operator, gen_uncertain_if,
        gen_threshold, gen_pipeline, gen_coalesce
    ]

    for _ in range(n):
        gen = random.choice(generators)
        q, a, category = gen()

        # Confidence based on question type
        if category in ["confidence_assignment", "confidence_extraction"]:
            overall_conf = random.uniform(0.85, 0.98)
            epistemic = random.uniform(0.02, 0.10)
        elif category == "operators":
            overall_conf = random.uniform(0.80, 0.95)
            epistemic = random.uniform(0.05, 0.12)
        else:
            overall_conf = random.uniform(0.75, 0.95)
            epistemic = random.uniform(0.05, 0.15)

        examples.append({
            "question": q,
            "answer": a,
            "domain": "prism",
            "category": category,
            "confidence": {
                "overall": round(overall_conf, 2),
                "epistemic": round(epistemic, 2),
                "aleatoric": round(random.uniform(0.02, 0.10), 2),
                "distribution_shift": round(random.uniform(0.01, 0.08), 2),
            }
        })

    return examples


def generate_math_examples(n: int) -> List[Dict]:
    """Generate diverse math Q&A examples."""
    examples = []

    for _ in range(n):
        category = random.choice(list(MATH_PATTERNS.keys()))
        pattern = random.choice(MATH_PATTERNS[category])
        q_template, a_template = pattern

        # Generate values based on category
        if category == "arithmetic":
            a, b = random.randint(1, 100), random.randint(1, 100)
            if "+" in q_template:
                result = a + b
            elif "-" in q_template:
                result = a - b
            elif "×" in q_template:
                result = a * b
            else:
                result = round(a / b, 2) if b != 0 else "undefined"

            q = q_template.replace("{a}", str(a)).replace("{b}", str(b))
            a_text = a_template.replace("{a}", str(a)).replace("{b}", str(b)).replace("{result}", str(result))

        elif category == "algebra":
            a, b, c = random.randint(1, 10), random.randint(1, 20), random.randint(10, 50)
            if "x²" in q_template:
                result = round(math.sqrt(a), 2)
                q = q_template.replace("{a}", str(a))
                a_text = a_template.replace("{a}", str(a)).replace("{result}", str(result))
            else:
                result = round((c - b) / a, 2) if a != 0 else "undefined"
                q = q_template.replace("{a}", str(a)).replace("{b}", str(b)).replace("{c}", str(c))
                a_text = a_template.replace("{a}", str(a)).replace("{b}", str(b)).replace("{c}", str(c)).replace("{result}", str(result))

        elif category == "calculus":
            n = random.randint(2, 6)
            q = q_template.replace("{n}", str(n))
            a_text = a_template.replace("{n}", str(n)).replace("{n_minus_1}", str(n-1)).replace("{n_plus_1}", str(n+1))

        else:  # statistics
            numbers = [random.randint(1, 100) for _ in range(5)]
            result = round(sum(numbers) / len(numbers), 2)
            q = q_template.replace("{numbers}", str(numbers))
            a_text = a_template.replace("{numbers}", str(numbers)).replace("{result}", str(result))

        # Math should have high confidence
        examples.append({
            "question": q,
            "answer": a_text,
            "domain": "math",
            "category": category,
            "confidence": {
                "overall": round(random.uniform(0.88, 0.99), 2),
                "epistemic": round(random.uniform(0.01, 0.08), 2),
                "aleatoric": round(random.uniform(0.01, 0.05), 2),
                "distribution_shift": round(random.uniform(0.01, 0.05), 2),
            }
        })

    return examples


def generate_code_examples(n: int) -> List[Dict]:
    """Generate diverse code Q&A examples."""
    examples = []

    var_names = ["x", "y", "z", "a", "b", "c", "i", "j", "n", "result", "value",
                 "data", "item", "count", "total", "sum", "avg", "temp", "num",
                 "name", "age", "price", "score", "index", "key", "val"]
    func_names = ["calculate", "process", "get", "set", "fetch", "load", "save",
                  "update", "delete", "find", "filter", "map", "reduce", "sort",
                  "validate", "check", "verify", "parse", "format", "convert"]
    types = ["number", "string", "boolean", "any", "object", "array", "void",
             "int", "float", "str", "bool", "list", "dict", "None"]
    values = list(range(-50, 51)) + [round(x*0.5, 1) for x in range(-20, 21)]

    def gen_js_var():
        var = random.choice(var_names)
        val = random.choice(values)
        kw = random.choice(["const", "let"])
        q = random.choice([
            f"How do I declare {var} = {val} in JavaScript?",
            f"Create a variable {var} with value {val} in JS",
            f"JavaScript: assign {val} to {var}",
        ])
        a = f"```javascript\n{kw} {var} = {val};\n```"
        return q, a, "javascript"

    def gen_js_function():
        func = random.choice(func_names)
        param = random.choice(var_names)
        q = random.choice([
            f"Write a function called {func} in JavaScript",
            f"How do I define {func}({param}) in JS?",
            f"Create function {func} with parameter {param}",
        ])
        a = f"```javascript\nfunction {func}({param}) {{\n  return {param};\n}}\n// or arrow: const {func} = ({param}) => {param};\n```"
        return q, a, "javascript"

    def gen_js_array():
        method = random.choice(["map", "filter", "reduce", "forEach", "find", "some", "every"])
        var = random.choice(var_names)
        q = random.choice([
            f"How do I use {method} on an array in JavaScript?",
            f"JavaScript array {method} example",
            f"Apply {method} to {var} array in JS",
        ])
        examples_map = {
            "map": f"{var}.map(x => x * 2)",
            "filter": f"{var}.filter(x => x > 0)",
            "reduce": f"{var}.reduce((acc, x) => acc + x, 0)",
            "forEach": f"{var}.forEach(x => console.log(x))",
            "find": f"{var}.find(x => x > 10)",
            "some": f"{var}.some(x => x > 0)",
            "every": f"{var}.every(x => x > 0)",
        }
        a = f"```javascript\nconst result = {examples_map[method]};\n```"
        return q, a, "javascript"

    def gen_ts_type():
        var = random.choice(var_names)
        typ = random.choice(["number", "string", "boolean", "number[]", "string[]"])
        q = random.choice([
            f"Add type annotation to {var} as {typ} in TypeScript",
            f"How do I type {var}: {typ} in TS?",
            f"TypeScript: declare {var} with type {typ}",
        ])
        a = f"```typescript\nconst {var}: {typ} = /* value */;\n```"
        return q, a, "typescript"

    def gen_ts_interface():
        name = random.choice(["User", "Item", "Config", "Data", "Response", "Request", "Options"])
        prop1, prop2 = random.sample(var_names, 2)
        q = random.choice([
            f"Define an interface {name} in TypeScript",
            f"Create {name} interface with {prop1} and {prop2}",
            f"TypeScript interface for {name}",
        ])
        a = f"```typescript\ninterface {name} {{\n  {prop1}: string;\n  {prop2}?: number;\n}}\n```"
        return q, a, "typescript"

    def gen_py_function():
        func = random.choice(func_names)
        param = random.choice(var_names)
        q = random.choice([
            f"Define a function {func} in Python",
            f"How do I write {func}({param}) in Python?",
            f"Python function {func} with parameter {param}",
        ])
        a = f"```python\ndef {func}({param}):\n    return {param}\n```"
        return q, a, "python"

    def gen_py_list_comp():
        var = random.choice(var_names)
        op = random.choice(["* 2", "+ 1", "** 2", "- 1"])
        cond = random.choice(["> 0", "< 10", "!= 0", ">= 5"])
        q = random.choice([
            f"List comprehension to transform {var} in Python",
            f"Filter {var} where x {cond} in Python",
            f"Python list comprehension example with {var}",
        ])
        a = f"```python\nresult = [x {op} for x in {var} if x {cond}]\n```"
        return q, a, "python"

    def gen_py_dict():
        key = random.choice(["name", "id", "key", "type", "value"])
        q = random.choice([
            f"Create a dictionary with '{key}' in Python",
            f"Python dict with {key} key",
            f"How to make a dictionary in Python?",
        ])
        a = f'```python\ndata = {{"{key}": "value", "count": 42}}\nprint(data["{key}"])\n```'
        return q, a, "python"

    generators = [
        gen_js_var, gen_js_function, gen_js_array,
        gen_ts_type, gen_ts_interface,
        gen_py_function, gen_py_list_comp, gen_py_dict
    ]

    for _ in range(n):
        gen = random.choice(generators)
        q, a, lang = gen()

        examples.append({
            "question": q,
            "answer": a,
            "domain": "code",
            "category": lang,
            "confidence": {
                "overall": round(random.uniform(0.80, 0.95), 2),
                "epistemic": round(random.uniform(0.05, 0.15), 2),
                "aleatoric": round(random.uniform(0.02, 0.08), 2),
                "distribution_shift": round(random.uniform(0.02, 0.10), 2),
            }
        })

    return examples


def generate_general_examples(n: int) -> List[Dict]:
    """Generate diverse general knowledge Q&A examples."""
    examples = []

    # Expandable fact templates
    capitals = {
        "France": "Paris", "Japan": "Tokyo", "Germany": "Berlin", "Italy": "Rome",
        "Spain": "Madrid", "UK": "London", "China": "Beijing", "Russia": "Moscow",
        "Brazil": "Brasília", "India": "New Delhi", "Australia": "Canberra",
        "Canada": "Ottawa", "Mexico": "Mexico City", "Egypt": "Cairo",
        "South Korea": "Seoul", "Argentina": "Buenos Aires", "Poland": "Warsaw",
        "Netherlands": "Amsterdam", "Belgium": "Brussels", "Sweden": "Stockholm",
        "Norway": "Oslo", "Denmark": "Copenhagen", "Finland": "Helsinki",
        "Greece": "Athens", "Portugal": "Lisbon", "Austria": "Vienna",
        "Switzerland": "Bern", "Ireland": "Dublin", "New Zealand": "Wellington",
        "Turkey": "Ankara", "Saudi Arabia": "Riyadh", "UAE": "Abu Dhabi",
        "Nigeria": "Abuja", "Kenya": "Nairobi", "South Africa": "Pretoria",
        "Thailand": "Bangkok", "Vietnam": "Hanoi", "Philippines": "Manila",
        "Indonesia": "Jakarta", "Pakistan": "Islamabad", "Bangladesh": "Dhaka",
        "Chile": "Santiago", "Peru": "Lima", "Colombia": "Bogotá",
        "Ukraine": "Kyiv", "Czech Republic": "Prague", "Romania": "Bucharest",
        "Hungary": "Budapest", "Singapore": "Singapore", "Israel": "Jerusalem",
    }

    elements = {
        "gold": ("Au", 79), "silver": ("Ag", 47), "iron": ("Fe", 26),
        "copper": ("Cu", 29), "oxygen": ("O", 8), "hydrogen": ("H", 1),
        "carbon": ("C", 6), "nitrogen": ("N", 7), "helium": ("He", 2),
        "sodium": ("Na", 11), "potassium": ("K", 19), "calcium": ("Ca", 20),
        "zinc": ("Zn", 30), "lead": ("Pb", 82), "tin": ("Sn", 50),
        "aluminum": ("Al", 13), "silicon": ("Si", 14), "chlorine": ("Cl", 17),
        "magnesium": ("Mg", 12), "phosphorus": ("P", 15), "sulfur": ("S", 16),
        "argon": ("Ar", 18), "nickel": ("Ni", 28), "cobalt": ("Co", 27),
        "iodine": ("I", 53), "uranium": ("U", 92), "neon": ("Ne", 10),
    }

    planets = {
        "Mercury": ("smallest", "closest to the Sun", 88),
        "Venus": ("hottest", "similar in size to Earth", 225),
        "Earth": ("our home", "has liquid water", 365),
        "Mars": ("red planet", "has the largest volcano", 687),
        "Jupiter": ("largest", "has the Great Red Spot", 4333),
        "Saturn": ("has rings", "least dense planet", 10759),
        "Uranus": ("tilted on its side", "ice giant", 30687),
        "Neptune": ("windiest", "farthest from Sun", 60190),
    }

    authors = {
        "Romeo and Juliet": "William Shakespeare",
        "1984": "George Orwell",
        "Pride and Prejudice": "Jane Austen",
        "The Great Gatsby": "F. Scott Fitzgerald",
        "To Kill a Mockingbird": "Harper Lee",
        "Hamlet": "William Shakespeare",
        "War and Peace": "Leo Tolstoy",
        "The Odyssey": "Homer",
        "Don Quixote": "Miguel de Cervantes",
        "Moby Dick": "Herman Melville",
        "The Catcher in the Rye": "J.D. Salinger",
        "The Hobbit": "J.R.R. Tolkien",
        "The Lord of the Rings": "J.R.R. Tolkien",
        "Crime and Punishment": "Fyodor Dostoevsky",
        "The Divine Comedy": "Dante Alighieri",
    }

    inventions = {
        "telephone": ("Alexander Graham Bell", 1876),
        "light bulb": ("Thomas Edison", 1879),
        "airplane": ("Wright Brothers", 1903),
        "printing press": ("Johannes Gutenberg", 1440),
        "World Wide Web": ("Tim Berners-Lee", 1989),
        "television": ("Philo Farnsworth", 1927),
        "automobile": ("Karl Benz", 1886),
        "radio": ("Guglielmo Marconi", 1895),
        "steam engine": ("James Watt", 1769),
        "transistor": ("John Bardeen, Walter Brattain, William Shockley", 1947),
        "microprocessor": ("Intel", 1971),
    }
    rivers = {
        "Nile": "Africa",
        "Amazon": "South America",
        "Yangtze": "Asia",
        "Mississippi": "North America",
        "Danube": "Europe",
        "Ganges": "Asia",
        "Mekong": "Asia",
        "Volga": "Europe",
    }
    mountains = {
        "Everest": ("Himalayas", 8848),
        "K2": ("Karakoram", 8611),
        "Kilimanjaro": ("Kilimanjaro", 5895),
        "Denali": ("Alaska Range", 6190),
        "Aconcagua": ("Andes", 6961),
    }
    currencies = {
        "United States": "USD",
        "Japan": "JPY",
        "European Union": "EUR",
        "United Kingdom": "GBP",
        "India": "INR",
        "Canada": "CAD",
        "Australia": "AUD",
        "Switzerland": "CHF",
    }
    programming_facts = {
        "CPU": "Central Processing Unit",
        "RAM": "Random Access Memory",
        "HTTP": "Hypertext Transfer Protocol",
        "URL": "Uniform Resource Locator",
        "API": "Application Programming Interface",
        "JSON": "JavaScript Object Notation",
        "SQL": "Structured Query Language",
    }

    def gen_capital():
        country = random.choice(list(capitals.keys()))
        capital = capitals[country]
        q = random.choice([
            f"What is the capital of {country}?",
            f"Name the capital city of {country}",
            f"Which city is the capital of {country}?",
            f"Capital of {country}?",
        ])
        a = random.choice([
            f"The capital of {country} is {capital}.",
            f"{capital} is the capital of {country}.",
            f"{country}'s capital city is {capital}.",
        ])
        return q, a, "geography"

    def gen_element():
        elem = random.choice(list(elements.keys()))
        symbol, number = elements[elem]
        q_type = random.choice(["symbol", "number"])
        if q_type == "symbol":
            q = random.choice([
                f"What is the chemical symbol for {elem}?",
                f"Chemical symbol of {elem}?",
                f"What symbol represents {elem} on the periodic table?",
            ])
            a = f"The chemical symbol for {elem} is {symbol}."
        else:
            q = random.choice([
                f"What is the atomic number of {elem}?",
                f"Atomic number of {elem}?",
                f"How many protons does {elem} have?",
            ])
            a = f"The atomic number of {elem} is {number}."
        return q, a, "chemistry"

    def gen_planet():
        planet = random.choice(list(planets.keys()))
        fact1, fact2, orbit_days = planets[planet]
        q = random.choice([
            f"Tell me about {planet}",
            f"What is {planet} known for?",
            f"Facts about the planet {planet}?",
            f"Describe {planet}",
        ])
        a = f"{planet} is {fact1}. It {fact2} and orbits the Sun in about {orbit_days} Earth days."
        return q, a, "astronomy"

    def gen_author():
        work = random.choice(list(authors.keys()))
        author = authors[work]
        q = random.choice([
            f"Who wrote {work}?",
            f"Who is the author of {work}?",
            f"Who authored {work}?",
            f"{work} was written by whom?",
        ])
        a = f"{work} was written by {author}."
        return q, a, "literature"

    def gen_invention():
        inv = random.choice(list(inventions.keys()))
        inventor, year = inventions[inv]
        q = random.choice([
            f"Who invented the {inv}?",
            f"When was the {inv} invented?",
            f"Who created the {inv}?",
        ])
        a = f"The {inv} was invented by {inventor} in {year}."
        return q, a, "history"

    def gen_river():
        river = random.choice(list(rivers.keys()))
        continent = rivers[river]
        q = random.choice([
            f"Which continent is the {river} River on?",
            f"Where is the {river} River located?",
            f"The {river} River is in which continent?",
        ])
        a = f"The {river} River is in {continent}."
        return q, a, "geography"

    def gen_mountain():
        mountain = random.choice(list(mountains.keys()))
        range_name, height = mountains[mountain]
        q = random.choice([
            f"Which mountain range is {mountain} in?",
            f"How tall is {mountain}?",
            f"Where is {mountain} located?",
        ])
        a = f"{mountain} is in the {range_name} range and is about {height} meters tall."
        return q, a, "geography"

    def gen_currency():
        country = random.choice(list(currencies.keys()))
        curr = currencies[country]
        q = random.choice([
            f"What is the currency of {country}?",
            f"Which currency is used in {country}?",
            f"{country} uses which currency?",
        ])
        a = f"The currency of {country} is {curr}."
        return q, a, "economics"

    def gen_programming_fact():
        term = random.choice(list(programming_facts.keys()))
        expansion = programming_facts[term]
        q = random.choice([
            f"What does {term} stand for?",
            f"Define {term}",
            f"Expand the acronym {term}",
        ])
        a = f"{term} stands for {expansion}."
        return q, a, "computing"

    def gen_history_event():
        events = [
            ("the French Revolution", 1789),
            ("World War I", 1914),
            ("World War II", 1939),
            ("the American Declaration of Independence", 1776),
            ("the fall of the Berlin Wall", 1989),
            ("the moon landing", 1969),
        ]
        event, year = random.choice(events)
        q = random.choice([
            f"When did {event} begin?",
            f"In what year did {event} occur?",
            f"Date of {event}?",
        ])
        a = f"{event} began in {year}."
        return q, a, "history"

    def gen_biology():
        facts = {
            "mitochondria": "Mitochondria are the powerhouses of the cell, producing ATP.",
            "ribosome": "Ribosomes are the cellular structures responsible for protein synthesis.",
            "photosynthesis": "Photosynthesis converts light energy into chemical energy in plants.",
            "ecosystem": "An ecosystem is a community of organisms interacting with their environment.",
        }
        concept = random.choice(list(facts.keys()))
        q = random.choice([
            f"What is {concept}?",
            f"Explain {concept}",
            f"Define {concept}",
        ])
        return q, facts[concept], "biology"

    def gen_physics():
        facts = {
            "velocity": "Velocity is speed with direction.",
            "acceleration": "Acceleration is the rate of change of velocity.",
            "force": "Force is mass times acceleration (F = ma).",
            "energy": "Energy is the capacity to do work.",
        }
        concept = random.choice(list(facts.keys()))
        q = random.choice([
            f"What is {concept} in physics?",
            f"Define {concept}",
            f"Explain {concept}",
        ])
        return q, facts[concept], "physics"

    def gen_unit():
        units = {
            "meter": "length",
            "kilogram": "mass",
            "second": "time",
            "ampere": "electric current",
            "kelvin": "temperature",
            "mole": "amount of substance",
            "candela": "luminous intensity",
        }
        unit = random.choice(list(units.keys()))
        q = random.choice([
            f"{unit} is a unit of what?",
            f"What does the SI unit {unit} measure?",
            f"Which quantity is measured in {unit}?",
        ])
        a = f"{unit} is the SI unit of {units[unit]}."
        return q, a, "science"

    def gen_math_concept():
        concepts = {
            "pi": "Pi (π) is approximately 3.14159 and represents the ratio of a circle's circumference to its diameter.",
            "prime number": "A prime number is a natural number greater than 1 that has no positive divisors other than 1 and itself.",
            "Pythagorean theorem": "The Pythagorean theorem states that in a right triangle, a² + b² = c², where c is the hypotenuse.",
            "Fibonacci sequence": "The Fibonacci sequence is a series where each number is the sum of the two preceding ones: 0, 1, 1, 2, 3, 5, 8...",
            "square root": "The square root of a number x is a value that, when multiplied by itself, equals x.",
        }
        concept = random.choice(list(concepts.keys()))
        q = random.choice([
            f"What is {concept}?",
            f"Explain {concept}",
            f"Define {concept}",
        ])
        return q, concepts[concept], "math"

    def gen_science():
        concepts = {
            "photosynthesis": "Photosynthesis is the process by which plants convert sunlight, water, and CO2 into glucose and oxygen.",
            "gravity": "Gravity is a fundamental force that attracts objects with mass toward each other.",
            "DNA": "DNA (deoxyribonucleic acid) is the molecule that carries genetic instructions for life.",
            "atom": "An atom is the smallest unit of matter that retains the properties of an element.",
            "cell": "A cell is the basic structural and functional unit of all living organisms.",
            "evolution": "Evolution is the process of change in living organisms over successive generations through natural selection.",
            "ecosystem": "An ecosystem is a community of living organisms interacting with their physical environment.",
            "mitosis": "Mitosis is the process of cell division that results in two identical daughter cells.",
        }
        concept = random.choice(list(concepts.keys()))
        q = random.choice([
            f"What is {concept}?",
            f"Explain {concept}",
            f"Define {concept}",
        ])
        return q, concepts[concept], "science"

    generators = [
        gen_capital, gen_element, gen_planet, gen_author, gen_invention,
        gen_river, gen_mountain, gen_currency, gen_programming_fact,
        gen_history_event, gen_biology, gen_physics, gen_unit,
        gen_math_concept, gen_science
    ]

    for _ in range(n):
        gen = random.choice(generators)
        q, a, category = gen()

        examples.append({
            "question": q,
            "answer": a,
            "domain": "general",
            "category": category,
            "confidence": {
                "overall": round(random.uniform(0.85, 0.98), 2),
                "epistemic": round(random.uniform(0.02, 0.10), 2),
                "aleatoric": round(random.uniform(0.01, 0.05), 2),
                "distribution_shift": round(random.uniform(0.01, 0.05), 2),
            }
        })

    return examples


def generate_ood_examples(n: int, domain: str) -> List[Dict]:
    """Generate out-of-distribution examples with low confidence."""
    examples = []

    for _ in range(n):
        q = random.choice(OOD_EXAMPLES)

        examples.append({
            "question": q,
            "answer": "I'm not confident I can answer this question accurately.",
            "domain": domain,
            "category": "ood",
            "confidence": {
                "overall": round(random.uniform(0.10, 0.35), 2),
                "epistemic": round(random.uniform(0.50, 0.80), 2),
                "aleatoric": round(random.uniform(0.10, 0.30), 2),
                "distribution_shift": round(random.uniform(0.60, 0.95), 2),
            }
        })

    return examples


def generate_router_examples(n: int) -> List[Dict]:
    """Generate router training examples (query -> domain classification)."""
    examples = []

    # Generate equal examples per domain
    per_domain = n // len(DOMAINS)

    for domain in DOMAINS:
        if domain == "prism":
            domain_examples = generate_prism_examples(per_domain)
        elif domain == "math":
            domain_examples = generate_math_examples(per_domain)
        elif domain == "code":
            domain_examples = generate_code_examples(per_domain)
        else:
            domain_examples = generate_general_examples(per_domain)

        for ex in domain_examples:
            examples.append({
                "query": ex["question"],
                "domain": domain,
                "routing_confidence": ex["confidence"]["overall"],
            })

    # Add OOD examples
    ood_n = int(n * DATASET_CONFIG.ood_ratio)
    for _ in range(ood_n):
        examples.append({
            "query": random.choice(OOD_EXAMPLES),
            "domain": "ood",
            "routing_confidence": random.uniform(0.1, 0.3),
        })

    random.shuffle(examples)
    return examples


# ============================================================================
# Main
# ============================================================================

def save_jsonl(data: List[Dict], path: Path):
    """Save as JSONL."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w') as f:
        for item in data:
            f.write(json.dumps(item) + '\n')
    print(f"  Saved {len(data):,} samples to {path}")


def hash_example(ex: Dict) -> str:
    """Create hash for deduplication."""
    import hashlib
    content = f"{ex.get('question', ex.get('query', ''))}{ex.get('answer', '')}"
    return hashlib.md5(content.encode()).hexdigest()


def deduplicate(data: List[Dict]) -> List[Dict]:
    """Remove duplicate examples."""
    seen = set()
    unique = []
    for ex in data:
        h = hash_example(ex)
        if h not in seen:
            seen.add(h)
            unique.append(ex)
    return unique


def split_data(data: List[Dict], val_ratio: float = 0.1) -> Tuple[List[Dict], List[Dict]]:
    """Split data into train/val with no overlap."""
    random.shuffle(data)
    split_idx = int(len(data) * (1 - val_ratio))
    return data[:split_idx], data[split_idx:]


def main():
    print("=" * 60)
    print("Generating Lumina PoC v2 Training Data (LEAK-FREE)")
    print("=" * 60)

    val_ratio = 0.1  # 10% for validation

    # Router data - generate all, dedupe, then split
    print("\n[Router Data]")
    total_router = int((DATASET_CONFIG.router_train + DATASET_CONFIG.router_val) * 1.5)  # Generate extra for deduping
    all_router = generate_router_examples(total_router)
    all_router = deduplicate(all_router)
    print(f"  Generated {total_router:,}, unique: {len(all_router):,}")
    router_train, router_val = split_data(all_router, val_ratio)
    save_jsonl(router_train, DATASETS_DIR / "router" / "train.jsonl")
    save_jsonl(router_val, DATASETS_DIR / "router" / "val.jsonl")

    # Specialist data for each domain
    for domain in DOMAINS:
        print(f"\n[{domain.upper()} Specialist Data]")

        total_needed = DATASET_CONFIG.specialist_train + DATASET_CONFIG.specialist_val
        # Generate 2x to account for deduplication
        n_generate = total_needed * 2
        n_ood = int(n_generate * DATASET_CONFIG.ood_ratio)

        # Generate domain-specific examples
        if domain == "prism":
            all_data = generate_prism_examples(n_generate - n_ood)
        elif domain == "math":
            all_data = generate_math_examples(n_generate - n_ood)
        elif domain == "code":
            all_data = generate_code_examples(n_generate - n_ood)
        else:
            all_data = generate_general_examples(n_generate - n_ood)

        # Add OOD examples
        all_data.extend(generate_ood_examples(n_ood, domain))

        # Deduplicate
        all_data = deduplicate(all_data)
        print(f"  Generated {n_generate:,}, unique: {len(all_data):,}")

        if len(all_data) < total_needed:
            print(f"  ⚠️  Warning: Only {len(all_data)} unique examples, wanted {total_needed}")
            print(f"     Need more diverse templates for this domain!")

        # Split with no overlap
        train_data, val_data = split_data(all_data, val_ratio)

        save_jsonl(train_data, DATASETS_DIR / f"{domain}_specialist" / "train.jsonl")
        save_jsonl(val_data, DATASETS_DIR / f"{domain}_specialist" / "val.jsonl")

    # Verification pass
    print("\n" + "=" * 60)
    print("VERIFICATION: Checking for leaks...")
    print("=" * 60)

    all_clean = True
    for domain_dir in sorted(DATASETS_DIR.iterdir()):
        if not domain_dir.is_dir():
            continue
        train_path = domain_dir / "train.jsonl"
        val_path = domain_dir / "val.jsonl"
        if not train_path.exists() or not val_path.exists():
            continue

        with open(train_path) as f:
            train_hashes = set(hash_example(json.loads(l)) for l in f if l.strip())
        with open(val_path) as f:
            val_hashes = set(hash_example(json.loads(l)) for l in f if l.strip())

        overlap = train_hashes & val_hashes
        if overlap:
            print(f"  ❌ {domain_dir.name}: {len(overlap)} leaked examples!")
            all_clean = False
        else:
            print(f"  ✓ {domain_dir.name}: No leaks (train={len(train_hashes)}, val={len(val_hashes)})")

    if all_clean:
        print("\n✓ All datasets are leak-free!")
    else:
        print("\n❌ Some datasets have leaks - check generation logic!")

    print("\n" + "=" * 60)
    print("Data generation complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
