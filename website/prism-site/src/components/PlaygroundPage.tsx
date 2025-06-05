import React, { useState } from 'react';
import CodeBlock from './CodeBlock';
import './PlaygroundPage.css';

const PlaygroundPage: React.FC = () => {
  const [code, setCode] = useState(`// Welcome to the Prism Playground!
// Try running some Prism code examples

// Example 1: Basic confidence assignment
measurement = 100 ~> 0.85
result = measurement * 2

// Example 2: LLM integration  
analysis = llm("What is artificial intelligence?")

// Example 3: Uncertainty-aware control flow
uncertain if (analysis ~> 0.8) {
  high { 
    decision = "High confidence result"
    action = "Proceed with analysis"
  }
  medium { 
    decision = "Medium confidence result"
    action = "Review manually"
  }
  low { 
    decision = "Low confidence result"
    action = "Gather more data"
  }
}

decision`);
  
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedExample, setSelectedExample] = useState('');

  const examples = [
    {
      id: 'basic',
      title: 'Basic Confidence',
      code: `// Basic confidence assignment and operations
value = 100 ~> 0.9
doubled = value * 2
result = doubled + 50

result`
    },
    {
      id: 'llm-simple', 
      title: 'Simple LLM Call',
      code: `// Basic LLM interaction
question = "What is machine learning?"
answer = llm(question)

answer`
    },
    {
      id: 'uncertain-if',
      title: 'Uncertain Control Flow',
      code: `// Demonstrate uncertain if statements
prediction = llm("Will it rain tomorrow?") ~> 0.7

uncertain if (prediction ~> 0.6) {
  high { 
    recommendation = "Take an umbrella"
    confidence_level = "high"
  }
  medium { 
    recommendation = "Check weather again"
    confidence_level = "medium"
  }
  low { 
    recommendation = "Weather unclear"
    confidence_level = "low"
  }
}

"Recommendation: " + recommendation + " (confidence: " + confidence_level + ")"`
    },
    {
      id: 'context',
      title: 'Context Management',
      code: `// Context-based execution
topic = "renewable energy"

in context Research {
  overview = llm("Provide overview of: " + topic)
  benefits = llm("What are benefits of: " + topic)
}

in context Analysis {
  challenges = llm("What challenges exist with: " + topic)
  solutions = llm("Solutions for: " + challenges)
}

report = "Topic: " + topic + " | Overview: " + overview + " | Benefits: " + benefits + " | Solutions: " + solutions

report`
    },
    {
      id: 'chained-llm',
      title: 'Chained LLM Calls',
      code: `// Chained AI reasoning
problem = "How to reduce plastic waste?"

step1 = llm("Break down the problem: " + problem)
step2 = llm("Based on analysis: " + step1 + " - what are practical solutions?")
step3 = llm("From these solutions: " + step2 + " - which is most feasible?")

final_answer = "Problem: " + problem + " | Best solution: " + step3

final_answer`
    }
  ];

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    
    // Simulate code execution with delay
    setTimeout(() => {
      // Mock output based on code content
      if (code.includes('llm(')) {
        if (code.includes('rain')) {
          setOutput(`Recommendation: Take an umbrella (confidence: high) (~85.0%)`);
        } else if (code.includes('artificial intelligence')) {
          setOutput(`"Artificial intelligence (AI) is a branch of computer science focused on creating systems that can perform tasks that typically require human intelligence, such as learning, reasoning, problem-solving, and understanding language." (~88.0%)`);
        } else if (code.includes('machine learning')) {
          setOutput(`"Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed for every task." (~90.0%)`);
        } else if (code.includes('renewable energy')) {
          setOutput(`"Topic: renewable energy | Overview: Renewable energy refers to energy sources that are naturally replenished... | Benefits: Environmental sustainability, energy independence... | Solutions: Government incentives, technology advancement..." (~87.0%)`);
        } else if (code.includes('plastic waste')) {
          setOutput(`"Problem: How to reduce plastic waste? | Best solution: Implement comprehensive recycling programs combined with biodegradable alternatives and consumer education campaigns" (~82.0%)`);
        } else {
          setOutput(`"This is a sample LLM response with natural language processing capabilities." (~85.0%)`);
        }
      } else if (code.includes('uncertain if')) {
        setOutput(`"High confidence result" (~89.0%)`);
      } else if (code.includes('measurement')) {
        setOutput(`250 (~85.0%)`);
      } else if (code.includes('value')) {
        setOutput(`250 (~90.0%)`);
      } else {
        setOutput(`42 (~95.0%)`);
      }
      setIsRunning(false);
    }, 1500);
  };

  const loadExample = (exampleId: string) => {
    const example = examples.find(e => e.id === exampleId);
    if (example) {
      setCode(example.code);
      setSelectedExample(exampleId);
      setOutput('');
    }
  };

  const resetPlayground = () => {
    setCode(`// Welcome to the Prism Playground!
// Try running some Prism code examples

measurement = 100 ~> 0.85
result = measurement * 2

result`);
    setOutput('');
    setSelectedExample('');
  };

  return (
    <div className="playground-page">
      <div className="playground-header">
        <h1>Prism Playground</h1>
        <p>Try Prism language features in real-time. Write code and see how uncertainty-aware programming works.</p>
      </div>

      <div className="playground-container">
        <div className="playground-sidebar">
          <h3>Examples</h3>
          <div className="examples-list">
            {examples.map(example => (
              <button
                key={example.id}
                className={`example-button ${selectedExample === example.id ? 'active' : ''}`}
                onClick={() => loadExample(example.id)}
              >
                {example.title}
              </button>
            ))}
          </div>
          
          <div className="playground-actions">
            <button className="reset-button" onClick={resetPlayground}>
              Reset Playground
            </button>
          </div>

          <div className="playground-help">
            <h4>Quick Tips</h4>
            <ul>
              <li><code>~&gt;</code> assigns confidence to values</li>
              <li><code>llm()</code> calls AI with automatic confidence</li>
              <li><code>uncertain if</code> branches by confidence level</li>
              <li><code>in context</code> creates isolated execution</li>
            </ul>
          </div>
        </div>

        <div className="playground-main">
          <div className="code-editor-section">
            <div className="editor-header">
              <h3>Code Editor</h3>
              <button 
                className={`run-button ${isRunning ? 'running' : ''}`}
                onClick={runCode}
                disabled={isRunning}
              >
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
            </div>
            
            <textarea
              className="code-editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write your Prism code here..."
              spellCheck={false}
            />
          </div>

          <div className="output-section">
            <div className="output-header">
              <h3>Output</h3>
              {output && (
                <button 
                  className="clear-output"
                  onClick={() => setOutput('')}
                >
                  Clear
                </button>
              )}
            </div>
            
            <div className="output-display">
              {isRunning ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <span>Executing Prism code...</span>
                </div>
              ) : output ? (
                <div className="output-content">
                  <CodeBlock code={output} language="output" />
                </div>
              ) : (
                <div className="output-placeholder">
                  Click "Run Code" to see the output
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="playground-info">
        <div className="info-section">
          <h3>About the Playground</h3>
          <p>
            This playground simulates Prism language execution. In a real implementation, 
            your code would be executed by the Prism interpreter with actual AI provider integration.
          </p>
          
          <div className="feature-highlights">
            <div className="feature">
              <strong>🎯 Confidence Values:</strong> Every result shows its confidence level in parentheses
            </div>
            <div className="feature">
              <strong>🤔 Uncertainty Handling:</strong> Automatic branching based on confidence thresholds
            </div>
            <div className="feature">
              <strong>🧠 AI Integration:</strong> Native LLM calls with built-in uncertainty tracking
            </div>
            <div className="feature">
              <strong>📦 Context Management:</strong> Isolated execution environments for complex workflows
            </div>
          </div>
        </div>

        <div className="next-steps">
          <h3>Next Steps</h3>
          <ul>
            <li>Check out the <a href="/docs">Documentation</a> for complete language reference</li>
            <li>Explore more <a href="/examples">Examples</a> for real-world use cases</li>
            <li>Clone the repository to try Prism locally with real AI providers</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundPage;