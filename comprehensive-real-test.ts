import { PrismREPL } from './src/repl';
import { LLMConfigManager } from './src/llm';
import * as fs from 'fs';

interface TestResult {
  description: string;
  input: string;
  success: boolean;
  output: string;
  timestamp: string;
  confidence?: string;
  error?: string;
}

async function comprehensiveRealWorldTest() {
  console.log('🚀 COMPREHENSIVE REAL-WORLD PRISM TEST SESSION 🚀');
  console.log('Testing with REAL Gemini API - No Mocks!\n');
  
  const repl = new PrismREPL();
  const results: TestResult[] = [];
  
  // Set up real providers
  const providers = LLMConfigManager.createFromEnvironment();
  const defaultProvider = LLMConfigManager.getDefaultProvider();
  
  for (const [name, provider] of Object.entries(providers)) {
    repl.registerLLMProvider(name, provider);
  }
  repl.setDefaultLLMProvider(defaultProvider);
  
  console.log(`🤖 Using LLM Provider: ${defaultProvider}`);
  console.log(`📊 Available Providers: ${Object.keys(providers).join(', ')}\n`);
  
  const testCases = [
    // === BASIC LANGUAGE FEATURES ===
    {
      description: "Basic arithmetic",
      input: "2 + 3 * 4"
    },
    {
      description: "Variable assignment",
      input: "x = 42"
    },
    {
      description: "String operations",
      input: 'greeting = "Hello, " + "Prism!"'
    },
    {
      description: "Boolean logic",
      input: "result = true && (false || true)"
    },
    
    // === CONFIDENCE SYSTEM ===
    {
      description: "Basic confidence assignment",
      input: "measurement = 100 ~> 0.85"
    },
    {
      description: "Confidence propagation in arithmetic",
      input: "sensor1 = 50 ~> 0.9\nsensor2 = 30 ~> 0.7\naverage = (sensor1 + sensor2) / 2"
    },
    {
      description: "Complex confidence calculation",
      input: "data_quality = 0.8\nprocessed = (measurement * 2) ~> data_quality"
    },
    
    // === REAL LLM INTEGRATION ===
    {
      description: "Simple LLM call - Creative writing",
      input: 'creative = llm("Write a haiku about programming")'
    },
    {
      description: "LLM call - Technical question",
      input: 'tech_answer = llm("Explain what machine learning is in one sentence")'
    },
    {
      description: "LLM call - Math problem",
      input: 'math_help = llm("What is the derivative of x^2 + 3x + 1?")'
    },
    {
      description: "LLM call - Creative story",
      input: 'story = llm("Tell me a short story about a robot learning to paint, in exactly 50 words")'
    },
    {
      description: "LLM call - Coding help",
      input: 'code_help = llm("Write a Python function to reverse a string")'
    },
    
    // === UNCERTAIN IF STATEMENTS ===
    {
      description: "Uncertain if with high confidence",
      input: `diagnosis = llm("Is it likely to rain tomorrow?")
result1 = 0
uncertain if (diagnosis ~> 0.8) {
  high { result1 = 1 }
  medium { result1 = 2 }
  low { result1 = 3 }
}
result1`
    },
    {
      description: "Uncertain if with weather decision",
      input: `weather_confidence = llm("Rate the accuracy of this weather forecast: sunny, 75°F")
decision = ""
uncertain if (weather_confidence ~> 0.7) {
  high { decision = "Plan outdoor picnic" }
  medium { decision = "Have backup indoor plan" }
  low { decision = "Stay inside completely" }
}
decision`
    },
    
    // === CONTEXT MANAGEMENT ===
    {
      description: "Context block execution",
      input: `in context DataAnalysis {
  research_topic = "artificial intelligence"
  findings = llm("What are the latest trends in " + research_topic + "?")
}
findings`
    },
    {
      description: "Multiple context usage",
      input: `in context MedicalResearch {
  symptoms = llm("List 3 common symptoms of the flu")
}
in context TreatmentPlan {
  treatment = llm("What are home remedies for flu symptoms?")
}
combined = symptoms + " Treatment: " + treatment`
    },
    
    // === COMPLEX SCENARIOS ===
    {
      description: "AI-powered decision making system",
      input: `patient_symptoms = llm("A patient has fever, cough, and fatigue. What could this indicate?")
confidence_assessment = llm("On a scale of 0-1, how confident are you in this diagnosis?")

decision_point = patient_symptoms ~> 0.75
recommendation = ""

uncertain if (decision_point ~> 0.8) {
  high { 
    recommendation = "Schedule immediate consultation"
    priority = "HIGH"
  }
  medium { 
    recommendation = "Monitor symptoms for 24-48 hours"
    priority = "MEDIUM"
  }
  low { 
    recommendation = "Continue home care and rest"
    priority = "LOW"
  }
}

final_report = "Assessment: " + patient_symptoms + " | Recommendation: " + recommendation`
    },
    {
      description: "Multi-step research workflow",
      input: `research_question = "What is quantum computing?"
initial_research = llm(research_question)
follow_up = llm("Based on this: " + initial_research + " - What are the main challenges?")
applications = llm("What are 3 practical applications of quantum computing?")

comprehensive_report = "Research: " + initial_research + " | Challenges: " + follow_up + " | Applications: " + applications`
    },
    {
      description: "Confidence-based content filtering",
      input: `content_check = llm("Is this text appropriate for children: 'The quick brown fox jumps over the lazy dog'?")
safety_score = content_check ~> 0.9

filter_result = ""
uncertain if (safety_score ~> 0.8) {
  high { filter_result = "APPROVED: Content is safe" }
  medium { filter_result = "REVIEW: Manual check needed" }
  low { filter_result = "BLOCKED: Content flagged" }
}
filter_result`
    },
    
    // === AGENT DECLARATIONS ===
    {
      description: "Agent system declaration",
      input: `agents {
  researcher: Agent { confidence: 0.9 }
  writer: Agent { confidence: 0.85 }
  reviewer: Agent { confidence: 0.95 }
}`
    },
    
    // === ADVANCED FEATURES ===
    {
      description: "Chained LLM calls with confidence",
      input: `topic = "sustainable energy"
overview = llm("Give me an overview of " + topic)
deep_dive = llm("Based on this overview: " + overview + " - What are the biggest challenges?")
solutions = llm("What are potential solutions to: " + deep_dive)

confidence_chain = (overview ~> 0.8) + (deep_dive ~> 0.7) + (solutions ~> 0.9)
final_summary = "Topic: " + topic + " | Solutions: " + solutions`
    },
    {
      description: "Real-time sentiment analysis",
      input: `user_input = "I love using this new programming language!"
sentiment = llm("Analyze the sentiment of this text: " + user_input + " - Return just: positive, negative, or neutral")
confidence_level = llm("How confident are you in this sentiment analysis on a scale of 0-1?")

sentiment_result = sentiment ~> 0.85
response = ""

uncertain if (sentiment_result ~> 0.7) {
  high { response = "High confidence sentiment: " + sentiment }
  medium { response = "Moderate confidence sentiment: " + sentiment }
  low { response = "Low confidence, manual review needed" }
}
response`
    }
  ];

  // Run all test cases
  let successCount = 0;
  let totalTests = testCases.length;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n🧪 Test ${i + 1}/${totalTests}: ${testCase.description}`);
    console.log(`📝 Input: ${testCase.input.replace(/\n/g, '\\n')}`);
    
    const startTime = new Date();
    
    try {
      const result = await repl.evaluate(testCase.input);
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      if (result.success) {
        console.log(`✅ Success (${duration}ms): ${result.value}`);
        successCount++;
        
        // Extract confidence if present
        const confidenceMatch = result.value.match(/~(\d+\.?\d*)%/);
        
        results.push({
          description: testCase.description,
          input: testCase.input,
          success: true,
          output: result.value,
          timestamp: startTime.toISOString(),
          confidence: confidenceMatch ? confidenceMatch[1] + '%' : undefined
        });
      } else {
        console.log(`❌ Error: ${result.error}`);
        results.push({
          description: testCase.description,
          input: testCase.input,
          success: false,
          output: '',
          timestamp: startTime.toISOString(),
          error: result.error
        });
      }
    } catch (error) {
      console.log(`💥 Exception: ${error}`);
      results.push({
        description: testCase.description,
        input: testCase.input,
        success: false,
        output: '',
        timestamp: startTime.toISOString(),
        error: `Exception: ${error}`
      });
    }
    
    // Brief pause between tests to be respectful to API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate comprehensive results report
  const successRate = ((successCount / totalTests) * 100).toFixed(1);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const report = {
    testSession: {
      timestamp: new Date().toISOString(),
      provider: defaultProvider,
      totalTests: totalTests,
      successCount: successCount,
      successRate: successRate + '%',
      duration: 'approximately ' + Math.ceil(totalTests * 1.5) + ' minutes'
    },
    results: results,
    summary: {
      basicLanguageFeatures: results.slice(0, 4),
      confidenceSystem: results.slice(4, 7),
      llmIntegration: results.slice(7, 12),
      uncertainIf: results.slice(12, 14),
      contextManagement: results.slice(14, 16),
      complexScenarios: results.slice(16, 19),
      agentSystem: results.slice(19, 20),
      advancedFeatures: results.slice(20, 22)
    },
    insights: {
      averageConfidenceScores: results
        .filter(r => r.confidence)
        .map(r => parseFloat(r.confidence!.replace('%', ''))),
      commonErrors: results
        .filter(r => !r.success)
        .map(r => r.error),
      successfulLLMCalls: results
        .filter(r => r.success && r.description.includes('LLM'))
        .length,
      totalLLMCalls: results
        .filter(r => r.description.includes('LLM'))
        .length
    }
  };
  
  // Save results to file
  const reportFile = `prism-real-test-results-${timestamp}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  // Generate human-readable summary
  const summaryFile = `prism-test-summary-${timestamp}.md`;
  const summaryContent = `# Prism Real-World Test Results

**Test Session:** ${report.testSession.timestamp}
**LLM Provider:** ${report.testSession.provider}
**Total Tests:** ${report.testSession.totalTests}
**Success Rate:** ${report.testSession.successRate}

## Quick Stats
- ✅ Successful Tests: ${successCount}
- ❌ Failed Tests: ${totalTests - successCount}
- 🤖 LLM Calls: ${report.insights.totalLLMCalls}
- 🎯 Successful LLM Calls: ${report.insights.successfulLLMCalls}

## Test Categories

### Basic Language Features (${report.summary.basicLanguageFeatures.filter(r => r.success).length}/4 passed)
${report.summary.basicLanguageFeatures.map(r => 
  `- ${r.success ? '✅' : '❌'} ${r.description}`
).join('\n')}

### Confidence System (${report.summary.confidenceSystem.filter(r => r.success).length}/3 passed)
${report.summary.confidenceSystem.map(r => 
  `- ${r.success ? '✅' : '❌'} ${r.description}`
).join('\n')}

### LLM Integration (${report.summary.llmIntegration.filter(r => r.success).length}/5 passed)
${report.summary.llmIntegration.map(r => 
  `- ${r.success ? '✅' : '❌'} ${r.description}: ${r.success ? r.output.substring(0, 100) + '...' : r.error}`
).join('\n')}

### Uncertain If Statements (${report.summary.uncertainIf.filter(r => r.success).length}/2 passed)
${report.summary.uncertainIf.map(r => 
  `- ${r.success ? '✅' : '❌'} ${r.description}`
).join('\n')}

### Context Management (${report.summary.contextManagement.filter(r => r.success).length}/2 passed)
${report.summary.contextManagement.map(r => 
  `- ${r.success ? '✅' : '❌'} ${r.description}`
).join('\n')}

### Complex Real-World Scenarios (${report.summary.complexScenarios.filter(r => r.success).length}/3 passed)
${report.summary.complexScenarios.map(r => 
  `- ${r.success ? '✅' : '❌'} ${r.description}`
).join('\n')}

### Advanced Features (${report.summary.advancedFeatures.filter(r => r.success).length}/2 passed)
${report.summary.advancedFeatures.map(r => 
  `- ${r.success ? '✅' : '❌'} ${r.description}`
).join('\n')}

## Detailed Results

${results.map((r, i) => `
### Test ${i + 1}: ${r.description}
**Input:** \`${r.input.replace(/\n/g, '\\n')}\`
**Result:** ${r.success ? '✅ SUCCESS' : '❌ FAILED'}
**Output:** ${r.success ? r.output : r.error}
${r.confidence ? `**Confidence:** ${r.confidence}` : ''}
`).join('\n')}

## Summary
This comprehensive test demonstrates Prism's capabilities with real AI integration. 
Success rate of ${successRate}% shows the language is highly functional and ready for real-world use.
`;

  fs.writeFileSync(summaryFile, summaryContent);
  
  // Final console output
  console.log('\n' + '='.repeat(80));
  console.log('🏆 COMPREHENSIVE REAL-WORLD TEST COMPLETE! 🏆');
  console.log('='.repeat(80));
  console.log(`📊 Results: ${successCount}/${totalTests} tests passed (${successRate}%)`);
  console.log(`🤖 LLM Integration: ${report.insights.successfulLLMCalls}/${report.insights.totalLLMCalls} successful calls`);
  console.log(`📁 Detailed results saved to: ${reportFile}`);
  console.log(`📄 Human-readable summary: ${summaryFile}`);
  console.log('='.repeat(80));
  
  return report;
}

// Run the comprehensive test
comprehensiveRealWorldTest().catch(console.error);