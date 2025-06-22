import React, { useState } from 'react';
import CodeBlock from './CodeBlock';
import './OperatorsPage.css';

interface Operator {
  symbol: string;
  name: string;
  category: string;
  description: string;
  example: string;
  output?: string;
}

const operators: Operator[] = [
  // Core Operators
  {
    symbol: '~>',
    name: 'Confidence Assignment',
    category: 'Core',
    description: 'Assigns a confidence level (0.0 to 1.0) to any value',
    example: 'temperature = 22.5 ~> 0.9',
    output: '22.5 (~90.0%)'
  },
  {
    symbol: '<~',
    name: 'Confidence Extraction',
    category: 'Core',
    description: 'Extracts the confidence level from a confident value',
    example: 'temp = 100 ~> 0.85\nconf = <~ temp',
    output: '0.85'
  },
  {
    symbol: '~~',
    name: 'Confidence Chaining',
    category: 'Core',
    description: 'Chains operations while propagating minimum confidence',
    example: 'result = input ~~ process ~~ validate',
    output: 'Result with minimum confidence'
  },
  {
    symbol: '~??',
    name: 'Confidence Coalesce',
    category: 'Core',
    description: 'Returns right operand if left has confidence < 0.5',
    example: 'result = uncertain_data ~?? fallback',
    output: 'fallback (if uncertain_data < 50%)'
  },
  
  // Logical Operators
  {
    symbol: '~&&',
    name: 'Confident AND',
    category: 'Logical',
    description: 'Logical AND with minimum confidence propagation',
    example: 'decision = condition1 ~&& condition2',
    output: 'true/false with min confidence'
  },
  {
    symbol: '~||',
    name: 'Confident OR',
    category: 'Logical',
    description: 'Logical OR with maximum confidence propagation',
    example: 'choice = option1 ~|| option2',
    output: 'true/false with max confidence'
  },
  
  // Arithmetic Operators
  {
    symbol: '~+',
    name: 'Confident Addition',
    category: 'Arithmetic',
    description: 'Addition with confidence propagation',
    example: 'total = (10 ~> 0.9) ~+ (20 ~> 0.7)',
    output: '30 (~70.0%)'
  },
  {
    symbol: '~-',
    name: 'Confident Subtraction',
    category: 'Arithmetic',
    description: 'Subtraction with confidence propagation',
    example: 'diff = (30 ~> 0.9) ~- (10 ~> 0.8)',
    output: '20 (~80.0%)'
  },
  {
    symbol: '~*',
    name: 'Confident Multiplication',
    category: 'Arithmetic',
    description: 'Multiplication with confidence propagation',
    example: 'product = (5 ~> 0.9) ~* (4 ~> 0.8)',
    output: '20 (~80.0%)'
  },
  {
    symbol: '~/',
    name: 'Confident Division',
    category: 'Arithmetic',
    description: 'Division with confidence propagation',
    example: 'quotient = (20 ~> 0.9) ~/ (4 ~> 0.8)',
    output: '5 (~80.0%)'
  },
  
  // Comparison Operators
  {
    symbol: '~==',
    name: 'Confident Equality',
    category: 'Comparison',
    description: 'Equality comparison with confidence',
    example: 'match = expected ~== actual',
    output: 'true/false with confidence'
  },
  {
    symbol: '~!=',
    name: 'Confident Inequality',
    category: 'Comparison',
    description: 'Inequality comparison with confidence',
    example: 'different = value1 ~!= value2',
    output: 'true/false with confidence'
  },
  {
    symbol: '~>',
    name: 'Confident Greater Than',
    category: 'Comparison',
    description: 'Greater than comparison with confidence',
    example: 'higher = value1 ~> value2',
    output: 'true/false with confidence'
  },
  {
    symbol: '~>=',
    name: 'Confident Greater Equal',
    category: 'Comparison',
    description: 'Greater than or equal with confidence',
    example: 'atLeast = value1 ~>= threshold',
    output: 'true/false with confidence'
  },
  {
    symbol: '~<',
    name: 'Confident Less Than',
    category: 'Comparison',
    description: 'Less than comparison with confidence',
    example: 'lower = value1 ~< value2',
    output: 'true/false with confidence'
  },
  {
    symbol: '~<=',
    name: 'Confident Less Equal',
    category: 'Comparison',
    description: 'Less than or equal with confidence',
    example: 'atMost = value1 ~<= limit',
    output: 'true/false with confidence'
  },
  
  // Advanced Operators
  {
    symbol: '~.',
    name: 'Confident Property Access',
    category: 'Advanced',
    description: 'Safe property navigation with confidence fallback',
    example: 'property = object ~. field',
    output: 'Property value or undefined'
  },
  {
    symbol: '~||>',
    name: 'Parallel Confidence',
    category: 'Advanced',
    description: 'Selects operand with highest confidence (ensemble pattern)',
    example: 'best = model1 ~||> model2 ~||> model3',
    output: 'Highest confidence result'
  },
  {
    symbol: '~@>',
    name: 'Threshold Gate',
    category: 'Advanced',
    description: 'Executes right operand only if left confidence ≥ 0.7',
    example: 'action = condition ~@> "execute"',
    output: '"execute" or reduced confidence'
  }
];

const OperatorsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', ...Array.from(new Set(operators.map(op => op.category)))];

  const filteredOperators = operators.filter(op => {
    const matchesCategory = selectedCategory === 'All' || op.category === selectedCategory;
    const matchesSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         op.symbol.includes(searchTerm) ||
                         op.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="operators-page">
      <div className="operators-hero">
        <div className="container">
          <h1 className="gradient-text">18 Confidence-Aware Operators</h1>
          <p className="hero-subtitle">
            Every operator in Prism understands and propagates uncertainty
          </p>
        </div>
      </div>

      <div className="container operators-content">
        <div className="operators-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search operators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="category-filters">
            {categories.map(category => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="operators-grid">
          {filteredOperators.map((op, index) => (
            <div key={index} className="operator-card glass-effect">
              <div className="operator-header">
                <span className="operator-symbol">{op.symbol}</span>
                <span className="operator-category">{op.category}</span>
              </div>
              
              <h3 className="operator-name">{op.name}</h3>
              <p className="operator-description">{op.description}</p>
              
              <div className="operator-example">
                <CodeBlock
                  code={op.example}
                  language="prism"
                  title="Example"
                />
                {op.output && (
                  <div className="operator-output">
                    <span className="output-label">Output:</span>
                    <code>{op.output}</code>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="operators-comparison">
          <h2>Why 18 Operators Matter</h2>
          <div className="comparison-grid">
            <div className="comparison-card glass-effect">
              <h3>Traditional Approach</h3>
              <CodeBlock
                code={`// Manual confidence tracking everywhere
class ConfidenceValue {
  constructor(value, confidence) {
    this.value = value;
    this.confidence = confidence;
  }
  
  add(other) {
    return new ConfidenceValue(
      this.value + other.value,
      Math.min(this.confidence, other.confidence)
    );
  }
}

const a = new ConfidenceValue(10, 0.9);
const b = new ConfidenceValue(20, 0.7);
const result = a.add(b); // So much boilerplate!`}
                language="javascript"
              />
            </div>
            
            <div className="comparison-card glass-effect">
              <h3>Prism Approach</h3>
              <CodeBlock
                code={`// Confidence is native to the language
a = 10 ~> 0.9
b = 20 ~> 0.7
result = a ~+ b  // Clean and intuitive!

// Even complex operations are simple
best = model1 ~||> model2 ~||> model3
safe = risky_op ~@> "proceed" ~?? "abort"`}
                language="prism"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorsPage;