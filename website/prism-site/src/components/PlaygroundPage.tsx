import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CodeBlock from './CodeBlock';
import './PlaygroundPage.css';

// Mock Prism execution for demo purposes
// In a real implementation, this would use the prism-uncertainty package
const mockPrismExecute = async (code: string): Promise<{ result: string; error?: string }> => {
  // Simulate execution delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simple mock execution logic
  try {
    if (code.includes('llm(')) {
      if (code.includes('weather') || code.includes('rain')) {
        return { result: 'Based on current patterns: 65% chance of rain with moderate confidence (~75.0%)' };
      } else if (code.includes('artificial intelligence')) {
        return { result: '"Artificial intelligence is the simulation of human intelligence by machines, encompassing learning, reasoning, and self-correction." (~88.0%)' };
      } else if (code.includes('machine learning')) {
        return { result: '"Machine learning is a subset of AI that enables systems to learn and improve from experience without explicit programming." (~90.0%)' };
      } else if (code.includes('renewable energy')) {
        return { result: 'Comprehensive analysis: Renewable energy sources offer sustainable alternatives with growing efficiency (~87.0%)' };
      } else if (code.includes('plastic waste')) {
        return { result: 'Solution: Implement circular economy principles with biodegradable alternatives (~82.0%)' };
      } else if (code.includes('content moderation')) {
        return { result: 'Content flagged for review - confidence threshold met (~85.0%)' };
      } else if (code.includes('AI safety')) {
        return { result: 'Critical: Implement robust alignment and monitoring systems (~91.0%)' };
      }
    }
    
    if (code.includes('uncertain if')) {
      if (code.includes('high {')) {
        return { result: 'Decision: Proceed with high confidence action (~85.0%)' };
      }
    }
    
    if (code.includes('~>')) {
      const match = code.match(/(\d+(?:\.\d+)?)\s*~>\s*(\d+(?:\.\d+)?)/);
      if (match) {
        return { result: `${match[1]} (~${parseFloat(match[2]) * 100}%)` };
      }
    }
    
    if (code.includes('~||>')) {
      return { result: 'Best model selected: Result with highest confidence (~92.0%)' };
    }
    
    if (code.includes('~@>')) {
      return { result: 'Threshold gate activated: Action executed (~78.0%)' };
    }
    
    // Default response
    return { result: '42 (~95.0%)' };
  } catch (error) {
    return { result: '', error: 'Execution error: ' + error };
  }
};

const PlaygroundPage: React.FC = () => {
  const [code, setCode] = useState(`// Welcome to the Prism Playground!
// Try running some examples to see uncertainty-aware programming in action

// Basic confidence assignment
temperature = 22.5 ~> 0.9
analysis = llm("Is this good weather for a picnic?")

// Make decision based on analysis
decision = analysis ~@> "Perfect weather!" ~?? "Check forecast"

decision`);
  
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedExample, setSelectedExample] = useState('');

  const examples = [
    {
      id: 'confidence-basics',
      title: '🎯 Confidence Basics',
      code: `// Confidence assignment and propagation
sensor1 = 100 ~> 0.95  // High confidence reading
sensor2 = 98 ~> 0.7    // Medium confidence reading

// Operations preserve confidence
average = (sensor1 + sensor2) / 2
confidence = <~ average

"Average: " + average + " with confidence: " + confidence`
    },
    {
      id: 'ai-ensemble',
      title: '🤖 AI Ensemble',
      code: `// Run multiple AI models in parallel
prompt = "Analyze market trends for renewable energy"

gpt = llm("GPT analysis: " + prompt)
claude = llm("Claude analysis: " + prompt) 
gemini = llm("Gemini analysis: " + prompt)

// Select highest confidence result
best = gpt ~||> claude ~||> gemini

"Best analysis selected with confidence: " + (<~ best)`
    },
    {
      id: 'content-moderation',
      title: '🛡️ Content Moderation',
      code: `// AI-powered content moderation system
content = "User submitted message..."

// Run safety checks
spam = llm("Is this spam? " + content) ~> 0.9
toxic = llm("Is this toxic? " + content) ~> 0.85
quality = llm("Rate content quality: " + content)

// Combine checks with confidence
safety = spam ~&& toxic
final = safety ~||> quality

// Threshold-based decision
uncertain if (final ~> 0.7) {
  high { 
    status = "✅ Auto-approved"
    action = "publish"
  }
  medium { 
    status = "⚠️ Manual review needed"
    action = "queue"
  }
  low { 
    status = "❌ Blocked"
    action = "reject"
  }
}

status + " - Action: " + action`
    },
    {
      id: 'medical-diagnosis',
      title: '🏥 Medical Assistant',
      code: `// AI-assisted medical diagnosis
symptoms = "fever, cough, fatigue"

// Get initial assessment
initial = llm("Assess symptoms: " + symptoms)
confidence = <~ initial

// Validate with second opinion
second = llm("Confirm assessment: " + initial)

// Combine opinions
consensus = initial ~&& second

// Risk-based recommendations
uncertain if (consensus ~> 0.8) {
  high {
    recommendation = "Schedule immediate consultation"
    urgency = "HIGH"
  }
  medium {
    recommendation = "Monitor for 24 hours"
    urgency = "MODERATE"
  }
  low {
    recommendation = "Rest and hydrate"
    urgency = "LOW"
  }
}

"Recommendation: " + recommendation + " (Urgency: " + urgency + ")"`
    },
    {
      id: 'research-chain',
      title: '🔬 Research Chain',
      code: `// Multi-step AI research workflow
topic = "quantum computing applications"

// Research pipeline with confidence chaining
overview = llm("Provide overview of: " + topic)
applications = llm("Based on: " + overview + " - list key applications")
challenges = llm("What challenges exist for: " + applications)
solutions = llm("Propose solutions for: " + challenges)

// Chain confidence through pipeline
final = overview ~~ applications ~~ challenges ~~ solutions

"Research complete with confidence: " + (<~ final)`
    },
    {
      id: 'operators-showcase',
      title: '✨ All Operators',
      code: `// Showcase all 18 confidence operators

// Core operators
value = 100 ~> 0.9          // Confidence assignment
conf = <~ value             // Confidence extraction
chain = a ~~ b ~~ c         // Confidence chaining
safe = risky ~?? fallback   // Confidence coalesce

// Logical operators
both = cond1 ~&& cond2      // Confident AND
either = opt1 ~|| opt2      // Confident OR

// Arithmetic operators
sum = (10 ~> 0.9) ~+ (20 ~> 0.8)
diff = val1 ~- val2
prod = val1 ~* val2
quot = val1 ~/ val2

// Comparison operators
equal = x ~== y
greater = x ~> y
less = x ~< y

// Advanced operators
prop = object ~. field       // Safe navigation
best = m1 ~||> m2 ~||> m3   // Parallel selection
gate = check ~@> action      // Threshold gate

"Operators demonstrated!"`
    }
  ];

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');
    
    try {
      const result = await mockPrismExecute(code);
      
      if (result.error) {
        setError(result.error);
      } else {
        setOutput(result.result);
      }
    } catch (err) {
      setError('Unexpected error: ' + err);
    } finally {
      setIsRunning(false);
    }
  };

  const loadExample = (exampleId: string) => {
    const example = examples.find(e => e.id === exampleId);
    if (example) {
      setCode(example.code);
      setSelectedExample(exampleId);
      setOutput('');
      setError('');
    }
  };

  const resetPlayground = () => {
    setCode(`// Welcome to the Prism Playground!
// Try running some examples

measurement = 100 ~> 0.85
result = measurement * 2

result`);
    setOutput('');
    setError('');
    setSelectedExample('');
  };

  return (
    <div className="playground-page">
      <div className="playground-header">
        <h1>🌟 Prism Playground</h1>
        <p>Experience uncertainty-aware programming in your browser. Write code and see how Prism handles confidence!</p>
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
              🔄 Reset Playground
            </button>
          </div>

          <div className="playground-help">
            <h4>Quick Reference</h4>
            <ul>
              <li><code>~&gt;</code> assigns confidence</li>
              <li><code>&lt;~</code> extracts confidence</li>
              <li><code>llm()</code> AI integration</li>
              <li><code>uncertain if</code> confidence branching</li>
              <li><code>~||&gt;</code> parallel selection</li>
              <li><code>~@&gt;</code> threshold gate</li>
            </ul>
          </div>
        </div>

        <div className="playground-main">
          <div className="code-editor-section">
            <div className="editor-header">
              <h3>📝 Code Editor</h3>
              <button 
                className={`run-button ${isRunning ? 'running' : ''}`}
                onClick={runCode}
                disabled={isRunning}
              >
                {isRunning ? '⏳ Running...' : '▶️ Run Code'}
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
              <h3>📊 Output</h3>
              {(output || error) && (
                <button 
                  className="clear-output"
                  onClick={() => { setOutput(''); setError(''); }}
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
              ) : error ? (
                <div className="error-output">
                  {error}
                </div>
              ) : output ? (
                <div className="output-content">
                  <CodeBlock code={output} language="prism" />
                </div>
              ) : (
                <div className="output-placeholder">
                  Click "Run Code" to see the output with confidence values
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="playground-info">
        <div className="info-section">
          <h3>🎮 About the Playground</h3>
          
          <div className="execution-notice">
            <span className="execution-notice-icon">ℹ️</span>
            <span className="execution-notice-text">
              This is a simulated environment. For real AI integration, install the npm package or clone the repository.
            </span>
          </div>
          
          <p>
            The Prism Playground demonstrates the core concepts of uncertainty-aware programming. 
            Every computation maintains confidence values automatically, enabling smarter AI applications.
          </p>
          
          <div className="feature-highlights">
            <div className="feature">
              <strong>🎯 Automatic Confidence Tracking</strong>
              Every value shows its confidence level in the output
            </div>
            <div className="feature">
              <strong>🤔 Uncertainty-Aware Branching</strong>
              Make decisions based on confidence thresholds
            </div>
            <div className="feature">
              <strong>🧠 Native AI Integration</strong>
              LLM calls with built-in confidence handling
            </div>
            <div className="feature">
              <strong>🔗 18 Specialized Operators</strong>
              Purpose-built for AI orchestration workflows
            </div>
          </div>
        </div>

        <div className="next-steps">
          <h3>🚀 Next Steps</h3>
          <ul>
            <li>Install the <Link to="/docs#npm-package">npm package</Link> for TypeScript projects</li>
            <li>Read the complete <Link to="/docs">Documentation</Link></li>
            <li>Explore <Link to="/operators">all 18 operators</Link> in detail</li>
            <li>View real-world <Link to="/examples">Examples</Link></li>
            <li>Join our <a href="https://github.com/HaruHunab1320/Prism-TS" target="_blank" rel="noopener noreferrer">GitHub</a> community</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundPage;