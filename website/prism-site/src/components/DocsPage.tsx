import React, { useState } from 'react';
import CodeBlock from './CodeBlock';
import './DocsPage.css';

const DocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started' },
    { id: 'installation', title: 'Installation' },
    { id: 'configuration', title: 'Configuration' },
    { id: 'language-basics', title: 'Language Basics' },
    { id: 'confidence-system', title: 'Confidence System' },
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
              <h1>Getting Started with Prism-TS</h1>
              <p>
                Prism-TS is a programming language designed for orchestrating Large Language Models 
                with built-in confidence handling and uncertainty-aware control flow.
              </p>
              
              <h2>What Makes Prism Special?</h2>
              <ul>
                <li><strong>Uncertainty as a First-Class Citizen</strong>: Handle AI uncertainty naturally</li>
                <li><strong>Confidence Propagation</strong>: Automatic uncertainty tracking through operations</li>
                <li><strong>Uncertain Control Flow</strong>: Branch logic based on confidence levels</li>
                <li><strong>Native LLM Integration</strong>: Built-in AI provider support</li>
              </ul>

              <h2>Your First Program</h2>
              <CodeBlock 
                code={`// Assign confidence to a value
measurement = 100 ~> 0.85

// Call an LLM with automatic confidence handling
analysis = llm("Analyze this measurement: " + measurement)

// Branch based on confidence level
uncertain if (analysis ~> 0.8) {
  high { decision = "High confidence result" }
  medium { decision = "Medium confidence result" }
  low { decision = "Low confidence result" }
}

decision`}
                language="prism"
                title="hello-world.prism"
              />
            </section>
          )}

          {activeSection === 'installation' && (
            <section>
              <h1>Installation</h1>
              
              <h2>Prerequisites</h2>
              <ul>
                <li>Node.js 16+ and npm</li>
                <li>TypeScript knowledge (helpful but not required)</li>
                <li>API keys for AI providers (Gemini or Claude)</li>
              </ul>

              <h2>Clone and Setup</h2>
              <CodeBlock 
                code={`# Clone the repository
git clone https://github.com/your-username/prism-ts.git
cd prism-ts

# Install dependencies
npm install

# Run tests to verify installation
npm test`}
                language="bash"
                title="Installation Commands"
              />

              <h2>Verify Installation</h2>
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
              
              <h3>Confidence Assignment (~&gt;)</h3>
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