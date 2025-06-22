import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CodeBlock from './CodeBlock';
import './DocsPage.css';

const DocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started' },
    { id: 'npm-package', title: 'NPM Package' },
    { id: 'installation', title: 'Installation' },
    { id: 'typescript-integration', title: 'TypeScript Integration' },
    { id: 'configuration', title: 'Configuration' },
    { id: 'language-basics', title: 'Language Basics' },
    { id: 'confidence-system', title: 'Confidence System' },
    { id: 'operators', title: 'All Operators' },
    { id: 'llm-integration', title: 'LLM Integration' },
    { id: 'control-flow', title: 'Control Flow' },
    { id: 'context-management', title: 'Context Management' },
    { id: 'api-reference', title: 'API Reference' }
  ];

  return (
    <div className="docs-page">
      <div className="docs-container">
        <nav className="docs-sidebar">
          <h3>Documentation</h3>
          <ul className="docs-nav">
            {sections.map(section => (
              <li key={section.id}>
                <button
                  className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="docs-content">
          {activeSection === 'getting-started' && (
            <section>
              <h1>Getting Started with Prism</h1>
              <p>
                Prism is a programming language where AI meets certainty. With 18 confidence-aware operators,
                native LLM integration, and uncertainty as a first-class citizen, Prism lets you write AI 
                applications that are 69% shorter than traditional approaches.
              </p>
              
              <h2>Two Ways to Use Prism</h2>
              
              <h3>1. As an NPM Package (Recommended)</h3>
              <p>Use Prism in your existing TypeScript/JavaScript projects:</p>
              <CodeBlock 
                code={`npm install prism-uncertainty

// In your TypeScript file
import { Prism } from 'prism-uncertainty';

const prism = new Prism();
const result = await prism.execute('42 ~> 0.9');`}
                language="bash"
              />
              
              <h3>2. As a Standalone Language</h3>
              <p>Clone the repository and use the REPL:</p>
              <CodeBlock 
                code={`git clone https://github.com/HaruHunab1320/Prism-TS
cd prism-ts
npm install
npm run repl`}
                language="bash"
              />

              <h2>What Makes Prism Special?</h2>
              <ul>
                <li><strong>18 Confidence-Aware Operators</strong>: From ~{'>'} to ~||{'>'}, every operator understands uncertainty</li>
                <li><strong>Zero Boilerplate</strong>: No manual confidence tracking classes or methods</li>
                <li><strong>TypeScript Integration</strong>: Use Prism logic in your existing codebase</li>
                <li><strong>Native LLM Support</strong>: Built-in integration with Gemini and Claude</li>
              </ul>

              <h2>Your First Program</h2>
              <CodeBlock 
                code={`// AI ensemble with confidence selection
gpt = llm("Analyze with GPT") 
claude = llm("Analyze with Claude")
gemini = llm("Analyze with Gemini")

// Automatically select highest confidence result
best = gpt ~||> claude ~||> gemini

// Execute only if confident enough
action = best ~@> "approve" ~?? "manual_review"`}
                language="prism"
                title="hello-world.prism"
              />
            </section>
          )}

          {activeSection === 'npm-package' && (
            <section>
              <h1>NPM Package: prism-uncertainty</h1>
              
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <strong>Latest Version:</strong> v1.0.1<br />
                <strong>Package:</strong> <a href="https://www.npmjs.com/package/prism-uncertainty" target="_blank" rel="noopener noreferrer">prism-uncertainty</a><br />
                <strong>License:</strong> MIT
              </div>
              
              <h2>Installation</h2>
              <CodeBlock 
                code={`# Using npm
npm install prism-uncertainty

# Using yarn
yarn add prism-uncertainty

# Using pnpm
pnpm add prism-uncertainty`}
                language="bash"
              />
              
              <h2>Basic Usage</h2>
              <CodeBlock 
                code={`import { Prism } from 'prism-uncertainty';

// Create a Prism instance
const prism = new Prism({
  geminiApiKey: 'your-api-key',    // Optional
  anthropicApiKey: 'your-api-key'  // Optional
});

// Execute Prism code
const result = await prism.execute(\`
  temperature = 22.5 ~> 0.9
  analysis = llm("Is this good weather?")
  decision = analysis ~@> "Go outside!" ~?? "Stay in"
  decision
\`);

console.log(result); // Confident decision`}
                language="typescript"
              />
              
              <h2>Quick Execution</h2>
              <p>For one-off executions, use the convenience function:</p>
              <CodeBlock 
                code={`import { runPrism } from 'prism-uncertainty';

const result = await runPrism(\`
  // Run multiple models in parallel
  best = model1 ~||> model2 ~||> model3
  best
\`);`}
                language="typescript"
              />
              
              <h2>Execute Files</h2>
              <CodeBlock 
                code={`// Execute a .prism file
const result = await prism.executeFile('./analysis.prism');`}
                language="typescript"
              />
              
              <h2>Package Exports</h2>
              <p>The package exports all core types and utilities:</p>
              <CodeBlock 
                code={`import {
  // Main API
  Prism,
  runPrism,
  
  // Types
  ConfidenceValue,
  Value,
  NumberValue,
  StringValue,
  BooleanValue,
  
  // Core components
  Tokenizer,
  Parser,
  Runtime,
  
  // Utilities
  isHighConfidence,
  isMediumConfidence,
  isLowConfidence
} from 'prism-uncertainty';`}
                language="typescript"
              />
            </section>
          )}

          {activeSection === 'installation' && (
            <section>
              <h1>Installation</h1>
              
              <h2>Option 1: NPM Package (Recommended)</h2>
              <p>Use Prism in your existing TypeScript/JavaScript projects:</p>
              <CodeBlock 
                code={`npm install prism-uncertainty

# Or globally for CLI access
npm install -g prism-uncertainty`}
                language="bash"
              />
              
              <h2>Option 2: From Source</h2>
              <p>For contributing or using the latest development version:</p>
              
              <h3>Prerequisites</h3>
              <ul>
                <li>Node.js 16+ and npm</li>
                <li>TypeScript knowledge (helpful but not required)</li>
                <li>API keys for AI providers (Gemini or Claude)</li>
              </ul>

              <h3>Clone and Setup</h3>
              <CodeBlock 
                code={`# Clone the repository
git clone https://github.com/HaruHunab1320/Prism-TS.git
cd prism-ts

# Install dependencies
npm install

# Run tests to verify installation
npm test`}
                language="bash"
                title="Installation Commands"
              />

              <h2>Verify Installation</h2>
              
              <h3>NPM Package</h3>
              <CodeBlock 
                code={`# If installed globally
prism --version

# In your code
import { Prism } from 'prism-uncertainty';
const prism = new Prism();`}
                language="bash"
              />
              
              <h3>From Source</h3>
              <CodeBlock 
                code={`# Start the REPL
npm run repl

# You should see:
🌟 Prism Language REPL v1.0
Type 'exit' to quit, 'help' for commands

prism>`}
                language="bash"
              />
            </section>
          )}

          {activeSection === 'typescript-integration' && (
            <section>
              <h1>TypeScript Integration</h1>
              
              <h2>Type-Safe Prism Usage</h2>
              <p>The prism-uncertainty package includes full TypeScript definitions for type-safe development.</p>
              
              <h2>Creating Wrapper Functions</h2>
              <CodeBlock 
                code={`import { Prism, ConfidenceValue } from 'prism-uncertainty';

interface AnalysisResult {
  decision: string;
  confidence: number;
  reasoning?: string;
}

async function analyzeWithConfidence(
  data: string,
  threshold: number = 0.8
): Promise<AnalysisResult> {
  const prism = new Prism();
  
  const result = await prism.execute(\`
    analysis = llm("Analyze: \${data}")
    conf = <~ analysis
    
    uncertain if (analysis ~> \${threshold}) {
      high { 
        decision = "approved"
        reasoning = "High confidence"
      }
      medium { 
        decision = "review"
        reasoning = "Medium confidence"
      }
      low { 
        decision = "rejected"
        reasoning = "Low confidence"
      }
    }
    
    decision + "|" + conf + "|" + reasoning
  \`);
  
  const [decision, conf, reasoning] = result.toString().split('|');
  
  return {
    decision,
    confidence: parseFloat(conf),
    reasoning
  };
}`}
                language="typescript"
              />
              
              <h2>React Hook Example</h2>
              <CodeBlock 
                code={`import { useState, useEffect } from 'react';
import { Prism } from 'prism-uncertainty';

function usePrism(code: string, deps: any[] = []) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const execute = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const prism = new Prism();
        const output = await prism.execute(code);
        setResult(output);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    execute();
  }, deps);
  
  return { result, loading, error };
}

// Usage
function MyComponent() {
  const { result, loading, error } = usePrism(\`
    analysis = llm("Analyze market trends")
    confidence = <~ analysis
    decision = analysis ~@> "invest" ~?? "wait"
    decision
  \`);
  
  if (loading) return <div>Analyzing...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>Decision: {result?.toString()}</div>;
}`}
                language="typescript"
              />
              
              <h2>Express.js API Example</h2>
              <CodeBlock 
                code={`import express from 'express';
import { Prism } from 'prism-uncertainty';

const app = express();
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  const { code, data } = req.body;
  
  try {
    const prism = new Prism();
    const result = await prism.execute(code);
    
    res.json({
      success: true,
      result: result.toString(),
      type: result.constructor.name
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});`}
                language="typescript"
              />
              
              <h2>Type Guards</h2>
              <CodeBlock 
                code={`import { ConfidenceValue, NumberValue } from 'prism-uncertainty';

function isConfidentNumber(value: any): value is ConfidenceValue {
  return value instanceof ConfidenceValue && 
         value.value instanceof NumberValue;
}

// Usage
const result = await prism.execute('42 ~> 0.9');
if (isConfidentNumber(result)) {
  console.log('Number:', result.value.value);
  console.log('Confidence:', result.confidence);
}`}
                language="typescript"
              />
            </section>
          )}

          {activeSection === 'configuration' && (
            <section>
              <h1>Configuration</h1>
              
              <h2>Environment Variables</h2>
              <p>Create a <code>.env</code> file in your project root:</p>
              
              <CodeBlock 
                code={`# Google Gemini (recommended for getting started)
GEMINI_API_KEY=your_gemini_api_key_here

# Anthropic Claude (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Set default provider
PRISM_DEFAULT_PROVIDER=gemini`}
                language="env"
                title=".env"
              />

              <h2>Getting API Keys</h2>
              
              <h3>Google Gemini</h3>
              <ol>
                <li>Visit <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                <li>Sign in with your Google account</li>
                <li>Create a new API key</li>
                <li>Copy the key to your <code>.env</code> file</li>
              </ol>

              <h3>Anthropic Claude</h3>
              <ol>
                <li>Visit <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Console</a></li>
                <li>Sign up for an account</li>
                <li>Navigate to API Keys section</li>
                <li>Create a new API key</li>
                <li>Copy the key to your <code>.env</code> file</li>
              </ol>
            </section>
          )}

          {activeSection === 'language-basics' && (
            <section>
              <h1>Language Basics</h1>
              
              <h2>Variables and Types</h2>
              <CodeBlock 
                code={`// Numbers
age = 30
temperature = 72.5
negative = -17

// Strings
name = "Alice"
greeting = "Hello, " + name

// Booleans
active = true
verified = age > 18

// Confident values
measurement = 100 ~> 0.85`}
                language="prism"
              />

              <h2>Operators</h2>
              <CodeBlock 
                code={`// Arithmetic
result = 10 + 5 * 2  // 20

// Comparison
is_adult = age >= 18
is_equal = name == "Alice"

// Logical
can_proceed = active && verified

// Confidence assignment
confident_result = calculation ~> 0.9`}
                language="prism"
              />

              <h2>Comments</h2>
              <CodeBlock 
                code={`// Single line comment
result = 42

/* 
  Multi-line comment
  for longer explanations
*/`}
                language="prism"
              />
            </section>
          )}

          {activeSection === 'operators' && (
            <section>
              <h1>All 18 Confidence-Aware Operators</h1>
              
              <p>
                Prism provides 18 operators designed specifically for handling uncertainty in AI applications.
                Each operator propagates confidence automatically, eliminating manual tracking.
              </p>
              
              <h2>Core Operators</h2>
              
              <h3>~{'>'} (Confidence Assignment)</h3>
              <CodeBlock 
                code={`temperature = 22.5 ~> 0.9  // 22.5 with 90% confidence`}
                language="prism"
              />
              
              <h3>&lt;~ (Confidence Extraction)</h3>
              <CodeBlock 
                code={`temp = 100 ~> 0.85
conf = <~ temp  // Returns 0.85`}
                language="prism"
              />
              
              <h3>~~ (Confidence Chaining)</h3>
              <CodeBlock 
                code={`result = input ~~ process ~~ validate  // Min confidence`}
                language="prism"
              />
              
              <h3>~?? (Confidence Coalesce)</h3>
              <CodeBlock 
                code={`result = uncertain_data ~?? fallback  // Use fallback if < 50%`}
                language="prism"
              />
              
              <h2>Logical Operators</h2>
              
              <h3>~&& (Confident AND)</h3>
              <CodeBlock 
                code={`decision = condition1 ~&& condition2  // AND with min confidence`}
                language="prism"
              />
              
              <h3>~|| (Confident OR)</h3>
              <CodeBlock 
                code={`choice = option1 ~|| option2  // OR with max confidence`}
                language="prism"
              />
              
              <h2>Arithmetic Operators</h2>
              
              <h3>~+, ~-, ~*, ~/ (Confident Arithmetic)</h3>
              <CodeBlock 
                code={`sum = (10 ~> 0.9) ~+ (20 ~> 0.7)   // 30 (~70.0%)
diff = (30 ~> 0.9) ~- (10 ~> 0.8)  // 20 (~80.0%)
prod = (5 ~> 0.9) ~* (4 ~> 0.8)    // 20 (~80.0%)
quot = (20 ~> 0.9) ~/ (4 ~> 0.8)   // 5 (~80.0%)`}
                language="prism"
              />
              
              <h2>Comparison Operators</h2>
              
              <h3>~==, ~!=, ~{'>'}, ~{'>'}=, ~&lt;, ~&lt;= (Confident Comparisons)</h3>
              <CodeBlock 
                code={`equal = value1 ~== value2      // Equality with confidence
notEqual = value1 ~!= value2   // Inequality with confidence
greater = value1 ~> value2      // Greater than with confidence
greaterEq = value1 ~>= value2   // Greater or equal with confidence
less = value1 ~< value2         // Less than with confidence
lessEq = value1 ~<= value2      // Less or equal with confidence`}
                language="prism"
              />
              
              <h2>Advanced Operators</h2>
              
              <h3>~. (Confident Property Access)</h3>
              <CodeBlock 
                code={`property = object ~. field  // Safe navigation with fallback`}
                language="prism"
              />
              
              <h3>~||{'>'} (Parallel Confidence)</h3>
              <CodeBlock 
                code={`// Select highest confidence result (ensemble pattern)
best = model1 ~||> model2 ~||> model3`}
                language="prism"
              />
              
              <h3>~@{'>'} (Threshold Gate)</h3>
              <CodeBlock 
                code={`// Execute right side only if left confidence >= 0.7
action = condition ~@> "proceed" ~?? "abort"`}
                language="prism"
              />
              
              <h2>Complete Example</h2>
              <CodeBlock 
                code={`// AI content moderation system
content = "User submitted text..."
spam = llm("Is this spam?") 
toxic = llm("Is this toxic?")
quality = llm("Rate quality 0-1")

// Combine checks with confidence
safety = spam ~&& toxic
final = safety ~||> quality

// Threshold-based decision
decision = final ~@> "auto_approve" ~?? "manual_review"

// Branch on final confidence
uncertain if (final ~> 0.8) {
  high { status = "✅ Approved" }
  medium { status = "⚠️ Review" }
  low { status = "❌ Blocked" }
}`}
                language="prism"
              />
              
              <p>
                <Link to="/operators" style={{ marginTop: '2rem', display: 'inline-block' }}>
                  View interactive operator documentation →
                </Link>
              </p>
            </section>
          )}

          {activeSection === 'confidence-system' && (
            <section>
              <h1>Confidence System</h1>
              
              <h2>Understanding Confidence</h2>
              <p>
                Confidence in Prism represents how certain we are about a value, 
                ranging from 0.0 (completely uncertain) to 1.0 (completely certain).
              </p>

              <h2>Confidence Levels</h2>
              <ul>
                <li><strong>High</strong>: &ge; 0.8 (80% or higher)</li>
                <li><strong>Medium</strong>: 0.5 - 0.8 (50% to 80%)</li>
                <li><strong>Low</strong>: &lt; 0.5 (below 50%)</li>
              </ul>

              <h2>Confidence Assignment</h2>
              <CodeBlock 
                code={`// Direct confidence assignment
precise_measurement = 100.0 ~> 0.95
estimated_value = 50 ~> 0.7
rough_guess = 25 ~> 0.3

// Variable confidence
data_quality = 0.8
measurement = sensor_reading ~> data_quality

// Computed confidence
reliability = calculate_reliability()
result = processed_data ~> reliability`}
                language="prism"
              />

              <h2>Confidence Propagation</h2>
              <CodeBlock 
                code={`sensor1 = 50 ~> 0.9   // High confidence
sensor2 = 30 ~> 0.6   // Medium confidence

// Result inherits the lower confidence
average = (sensor1 + sensor2) / 2  // 40 (~60.0%)

// Operations preserve uncertainty
doubled = sensor1 * 2              // 100 (~90.0%)
combined = sensor1 + sensor2       // 80 (~60.0%)`}
                language="prism"
              />
            </section>
          )}

          {activeSection === 'llm-integration' && (
            <section>
              <h1>LLM Integration</h1>
              
              <h2>Basic LLM Calls</h2>
              <CodeBlock 
                code={`// Simple question
answer = llm("What is machine learning?")

// Variable prompts
topic = "quantum computing"
explanation = llm("Explain " + topic + " in simple terms")

// The response automatically includes confidence
// answer contains both text and confidence level`}
                language="prism"
              />

              <h2>Chained LLM Calls</h2>
              <CodeBlock 
                code={`// Research workflow
initial_research = llm("What is artificial intelligence?")
deep_dive = llm("Based on: " + initial_research + " - what are the challenges?")
solutions = llm("For these challenges: " + deep_dive + " - what are solutions?")

// Combine results
report = initial_research + " | Challenges: " + deep_dive`}
                language="prism"
              />

              <h2>Prompt Engineering</h2>
              <CodeBlock 
                code={`// Chain of thought
problem = "Calculate the area of a circle with radius 5"
thinking = llm("Think step by step: " + problem)
solution = llm("Based on this reasoning: " + thinking + " - final answer")

// Few-shot examples
examples = "Example: Input 'happy' -> positive"
user_input = "I love this!"
sentiment = llm(examples + "\\nClassify: " + user_input + " ->")

// Role-based prompting
role = "You are an expert financial advisor"
question = "Should I invest in tech stocks?"
advice = llm(role + ". A client asks: " + question)`}
                language="prism"
              />
            </section>
          )}

          {activeSection === 'control-flow' && (
            <section>
              <h1>Control Flow</h1>
              
              <h2>Standard If Statements</h2>
              <CodeBlock 
                code={`if (temperature > 70) {
  comfort_level = "warm"
} else {
  comfort_level = "cool"
}`}
                language="prism"
              />

              <h2>Uncertain If Statements</h2>
              <p>The power of Prism lies in uncertainty-aware control flow:</p>
              
              <CodeBlock 
                code={`diagnosis = llm("Analyze these symptoms: fever, cough")

uncertain if (diagnosis ~> 0.75) {
  high { 
    // Confidence ≥ 80%
    action = "Schedule immediate consultation"
    priority = "urgent"
  }
  medium { 
    // Confidence 50-80%
    action = "Monitor symptoms for 24 hours"
    priority = "moderate"
  }
  low { 
    // Confidence < 50%
    action = "Continue home care"
    priority = "low"
  }
}`}
                language="prism"
              />

              <h2>Nested Uncertain If</h2>
              <CodeBlock 
                code={`primary = llm("Primary assessment: " + symptoms)
secondary = llm("Confirm diagnosis: " + primary)

uncertain if (primary ~> 0.8) {
  high {
    uncertain if (secondary ~> 0.7) {
      high { confidence_level = "very_high" }
      medium { confidence_level = "high" }
      low { confidence_level = "moderate" }
    }
  }
  medium { confidence_level = "low" }
  low { confidence_level = "very_low" }
}`}
                language="prism"
              />
            </section>
          )}

          {activeSection === 'context-management' && (
            <section>
              <h1>Context Management</h1>
              
              <h2>Basic Context Usage</h2>
              <p>Contexts provide isolated execution environments:</p>
              
              <CodeBlock 
                code={`in context DataCollection {
  raw_data = llm("Generate sample customer feedback")
  cleaned_data = preprocess(raw_data)
}

in context Analysis {
  sentiment = llm("Analyze sentiment: " + cleaned_data)
  themes = llm("Extract key themes: " + cleaned_data)
}

// Variables from contexts are accessible
final_report = "Sentiment: " + sentiment + " | Themes: " + themes`}
                language="prism"
              />

              <h2>Context Isolation</h2>
              <CodeBlock 
                code={`in context MedicalAssessment {
  symptoms = "fever, cough, fatigue"
  diagnosis = llm("Assess these symptoms: " + symptoms)
}

in context TreatmentPlanning {
  // Can access variables from previous context
  treatment = llm("Recommend treatment for: " + diagnosis)
  medication = llm("Suggest medication for: " + symptoms)
}

treatment_plan = diagnosis + " | Treatment: " + treatment`}
                language="prism"
              />

              <h2>Nested Contexts</h2>
              <CodeBlock 
                code={`in context OuterContext {
  global_setting = "shared_value"
  
  in context InnerContext {
    local_data = llm("Process with: " + global_setting)
    result = analyze(local_data)
  }
  
  final_result = combine(global_setting, result)
}`}
                language="prism"
              />
            </section>
          )}

          {activeSection === 'api-reference' && (
            <section>
              <h1>API Reference</h1>
              
              <h2>Built-in Functions</h2>
              
              <h3>llm(prompt)</h3>
              <p>Calls the configured LLM provider with the given prompt.</p>
              
              <CodeBlock 
                code={`// Basic usage
response = llm("Your prompt here")

// With variables
topic = "machine learning"
explanation = llm("Explain " + topic)

// Returns ConfidenceValue with text and confidence`}
                language="prism"
              />

              <h2>Operators</h2>
              
              <h3>Confidence Assignment (~{'>'})</h3>
              <CodeBlock 
                code={`// Syntax: expression ~> confidence_value
measurement = 100 ~> 0.85
variable_conf = data ~> quality_score`}
                language="prism"
              />

              <h3>Arithmetic Operators</h3>
              <CodeBlock 
                code={`+   // Addition (numbers) or concatenation (strings)
-   // Subtraction
*   // Multiplication
/   // Division`}
                language="prism"
              />

              <h3>Comparison Operators</h3>
              <CodeBlock 
                code={`>   // Greater than
<   // Less than
>=  // Greater than or equal
<=  // Less than or equal
==  // Equal
!=  // Not equal`}
                language="prism"
              />

              <h3>Logical Operators</h3>
              <CodeBlock 
                code={`&&  // Logical AND
||  // Logical OR
!   // Logical NOT`}
                language="prism"
              />

              <h2>Control Flow Statements</h2>
              
              <h3>if / else</h3>
              <CodeBlock 
                code={`if (condition) {
  // then branch
} else {
  // else branch (optional)
}`}
                language="prism"
              />

              <h3>uncertain if</h3>
              <CodeBlock 
                code={`uncertain if (confident_expression ~> threshold) {
  high { /* confidence >= 0.8 */ }
  medium { /* 0.5 <= confidence < 0.8 */ }
  low { /* confidence < 0.5 */ }
}`}
                language="prism"
              />

              <h3>context</h3>
              <CodeBlock 
                code={`in context ContextName {
  // Isolated execution environment
  variable = value
  result = computation
}`}
                language="prism"
              />
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default DocsPage;