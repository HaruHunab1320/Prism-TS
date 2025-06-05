import React, { useState } from 'react';
import CodeBlock from './CodeBlock';
import './ExamplesPage.css';

const ExamplesPage: React.FC = () => {
  const [activeExample, setActiveExample] = useState('medical-triage');

  const examples = [
    {
      id: 'medical-triage',
      title: 'Medical Triage System',
      description: 'AI-powered medical decision making with confidence-based routing',
      category: 'Healthcare'
    },
    {
      id: 'content-filter',
      title: 'Content Safety Filter',
      description: 'Automated content moderation with uncertainty handling',
      category: 'Safety'
    },
    {
      id: 'research-workflow',
      title: 'Multi-Step Research',
      description: 'Complex research pipeline with context management',
      category: 'Research'
    },
    {
      id: 'sentiment-analysis',
      title: 'Sentiment Analysis Pipeline',
      description: 'Real-time sentiment analysis with confidence levels',
      category: 'Analytics'
    },
    {
      id: 'financial-advisor',
      title: 'Financial Advisory Bot',
      description: 'Investment advice with risk assessment',
      category: 'Finance'
    },
    {
      id: 'code-reviewer',
      title: 'AI Code Reviewer',
      description: 'Automated code review with confidence scoring',
      category: 'Development'
    }
  ];

  const exampleContent = {
    'medical-triage': {
      code: `// Medical Triage System
// Analyzes patient symptoms and routes based on confidence

// Collect patient information
patient_symptoms = "fever 101°F, persistent cough, fatigue, difficulty breathing"
patient_age = 65
medical_history = "diabetes, high blood pressure"

// AI assessment with context
in context MedicalAssessment {
  // Primary assessment
  symptom_analysis = llm("Analyze these symptoms for severity: " + patient_symptoms)
  
  // Risk factors consideration
  risk_assessment = llm("Assess risk factors for patient age " + patient_age + 
                       " with history: " + medical_history + 
                       " and symptoms: " + patient_symptoms)
  
  // Combine assessments
  combined_assessment = llm("Based on symptom analysis: " + symptom_analysis + 
                           " and risk factors: " + risk_assessment + 
                           " - provide overall severity assessment")
}

// Confidence-based routing
decision_point = combined_assessment ~> 0.75
final_recommendation = ""
urgency_level = ""

uncertain if (decision_point ~> 0.8) {
  high { 
    // High confidence assessment
    final_recommendation = "EMERGENCY: Schedule immediate consultation"
    urgency_level = "CRITICAL"
    wait_time = "0 minutes"
  }
  medium { 
    // Medium confidence - need human review
    final_recommendation = "URGENT: Schedule within 2 hours, flag for physician review"
    urgency_level = "HIGH"
    wait_time = "30-60 minutes"
  }
  low { 
    // Low confidence - gather more information
    final_recommendation = "STANDARD: Schedule appointment, request additional symptoms"
    urgency_level = "MODERATE"
    wait_time = "24-48 hours"
  }
}

// Generate comprehensive report
medical_report = "PATIENT TRIAGE REPORT\\n" +
                "Symptoms: " + patient_symptoms + "\\n" +
                "Assessment: " + combined_assessment + "\\n" +
                "Recommendation: " + final_recommendation + "\\n" +
                "Urgency: " + urgency_level + "\\n" +
                "Expected Wait: " + wait_time

medical_report`,
      explanation: `This example demonstrates a complete medical triage system that:

**Key Features:**
- Uses context management to organize medical assessment
- Combines multiple AI assessments for comprehensive evaluation  
- Routes patients based on confidence levels
- Handles uncertainty gracefully with appropriate fallbacks

**Confidence Levels:**
- **High (≥80%)**: Emergency routing for critical cases
- **Medium (50-80%)**: Urgent care with human review
- **Low (<50%)**: Standard care with additional data collection

**Real-World Applications:**
- Hospital emergency department triage
- Telemedicine patient routing
- Medical hotline call classification
- Remote patient monitoring alerts`
    },
    'content-filter': {
      code: `// Content Safety Filter
// Automatically moderates user content with confidence-based decisions

user_content = "This is some user-generated content that needs to be checked for safety."
content_type = "social_media_post"
target_audience = "general_public"

// Multi-stage content analysis
in context SafetyAnalysis {
  // Basic safety check
  safety_assessment = llm("Is this content safe for " + target_audience + "? Content: " + user_content)
  
  // Specific harm categories
  harmful_content = llm("Check for harmful content (violence, hate speech, harassment): " + user_content)
  inappropriate_content = llm("Check for inappropriate content (adult themes, profanity): " + user_content)
  
  // Age appropriateness
  age_appropriate = llm("Is this content appropriate for minors? Content: " + user_content)
}

// Combine safety scores with confidence weighting
safety_score = safety_assessment ~> 0.9
harm_score = harmful_content ~> 0.85  
inappropriate_score = inappropriate_content ~> 0.8
age_score = age_appropriate ~> 0.75

// Decision logic with uncertainty handling
filter_decision = ""
confidence_level = ""
action_required = ""

uncertain if (safety_score ~> 0.8) {
  high {
    // High confidence in safety assessment
    uncertain if (harm_score ~> 0.7) {
      high {
        filter_decision = "APPROVED: Content is safe for publication"
        confidence_level = "HIGH"
        action_required = "none"
      }
      medium {
        filter_decision = "APPROVED: Content approved with minor concerns"
        confidence_level = "MEDIUM"
        action_required = "log_for_review"
      }
      low {
        filter_decision = "FLAGGED: Content flagged for manual review"
        confidence_level = "LOW"
        action_required = "human_review_required"
      }
    }
  }
  medium {
    // Medium confidence - be more cautious
    filter_decision = "REVIEW: Manual review required due to uncertainty"
    confidence_level = "MEDIUM"
    action_required = "manual_review"
  }
  low {
    // Low confidence - block and review
    filter_decision = "BLOCKED: Content blocked pending review"
    confidence_level = "LOW"
    action_required = "block_and_review"
  }
}

// Generate moderation report
moderation_report = "CONTENT MODERATION REPORT\\n" +
                   "Content Type: " + content_type + "\\n" +
                   "Target Audience: " + target_audience + "\\n" +
                   "Safety Assessment: " + safety_assessment + "\\n" +
                   "Decision: " + filter_decision + "\\n" +
                   "Confidence: " + confidence_level + "\\n" +
                   "Action Required: " + action_required

moderation_report`,
      explanation: `This content filtering system showcases:

**Multi-Layered Analysis:**
- Basic safety assessment for general appropriateness
- Specific harm detection (violence, hate speech)
- Age-appropriate content verification
- Contextual analysis based on target audience

**Confidence-Based Decisions:**
- **High Confidence**: Automatic approval or blocking
- **Medium Confidence**: Flag for human review
- **Low Confidence**: Conservative blocking with manual review

**Practical Applications:**
- Social media content moderation
- Comment filtering systems
- User-generated content platforms
- Educational content verification
- Community forums and discussion boards

**Error Handling:**
- Graceful degradation when AI is uncertain
- Human-in-the-loop for edge cases
- Audit trail for compliance and improvement`
    },
    'research-workflow': {
      code: `// Multi-Step Research Workflow
// Comprehensive research pipeline with context management

research_topic = "impact of artificial intelligence on healthcare"
research_depth = "comprehensive"
target_audience = "healthcare professionals"

// Phase 1: Initial Research and Foundation
in context InitialResearch {
  // Broad overview
  topic_overview = llm("Provide a comprehensive overview of: " + research_topic)
  
  // Key concepts and terminology
  key_concepts = llm("Extract and define the 5 most important concepts from: " + topic_overview)
  
  // Historical context
  historical_context = llm("Provide historical context and timeline for: " + research_topic)
}

// Phase 2: Deep Dive Analysis
in context DeepAnalysis {
  // Current state analysis
  current_state = llm("Based on this overview: " + topic_overview + 
                     " - analyze the current state and recent developments")
  
  // Challenges and limitations
  challenges = llm("What are the main challenges and limitations in: " + research_topic + 
                  "? Reference: " + current_state)
  
  // Opportunities and potential
  opportunities = llm("What opportunities and potential benefits exist in: " + research_topic + 
                     "? Consider: " + current_state)
}

// Phase 3: Expert Perspectives and Case Studies  
in context ExpertAnalysis {
  // Expert opinions synthesis
  expert_views = llm("Synthesize expert opinions and perspectives on: " + research_topic + 
                    " considering challenges: " + challenges + 
                    " and opportunities: " + opportunities)
  
  // Case studies and examples
  case_studies = llm("Provide 3 detailed case studies or real-world examples of: " + research_topic)
  
  // Future predictions
  future_outlook = llm("Based on expert views: " + expert_views + 
                      " and case studies: " + case_studies + 
                      " - predict future developments in: " + research_topic)
}

// Phase 4: Synthesis and Recommendations
in context FinalSynthesis {
  // Comprehensive synthesis
  research_synthesis = llm("Synthesize all findings into a coherent analysis. Include: " +
                          "Overview: " + topic_overview +
                          " | Current State: " + current_state +
                          " | Challenges: " + challenges +
                          " | Opportunities: " + opportunities +
                          " | Expert Views: " + expert_views +
                          " | Future Outlook: " + future_outlook)
  
  // Actionable recommendations
  recommendations = llm("Based on the comprehensive analysis: " + research_synthesis + 
                       " - provide specific, actionable recommendations for: " + target_audience)
}

// Confidence assessment of final research
research_confidence = research_synthesis ~> 0.8
recommendation_confidence = recommendations ~> 0.75

// Generate final report with confidence indicators
final_confidence = ""
research_quality = ""

uncertain if (research_confidence ~> 0.7) {
  high {
    uncertain if (recommendation_confidence ~> 0.7) {
      high {
        final_confidence = "HIGH"
        research_quality = "Comprehensive and reliable research with actionable insights"
      }
      medium {
        final_confidence = "MEDIUM-HIGH"  
        research_quality = "Solid research with recommendations requiring validation"
      }
      low {
        final_confidence = "MEDIUM"
        research_quality = "Good research but recommendations need expert review"
      }
    }
  }
  medium {
    final_confidence = "MEDIUM"
    research_quality = "Adequate research but may need additional sources"
  }
  low {
    final_confidence = "LOW"
    research_quality = "Initial research only - requires significant additional work"
  }
}

// Compile comprehensive research report
comprehensive_report = "COMPREHENSIVE RESEARCH REPORT\\n" +
                      "Topic: " + research_topic + "\\n" +
                      "Target Audience: " + target_audience + "\\n\\n" +
                      "EXECUTIVE SUMMARY\\n" + research_synthesis + "\\n\\n" +
                      "KEY RECOMMENDATIONS\\n" + recommendations + "\\n\\n" +
                      "RESEARCH QUALITY ASSESSMENT\\n" +
                      "Confidence Level: " + final_confidence + "\\n" +
                      "Quality Assessment: " + research_quality

comprehensive_report`,
      explanation: `This research workflow demonstrates advanced Prism features:

**Context-Driven Organization:**
- **InitialResearch**: Foundation and background research
- **DeepAnalysis**: Current state and trend analysis  
- **ExpertAnalysis**: Perspectives and case studies
- **FinalSynthesis**: Comprehensive integration

**Progressive Knowledge Building:**
- Each phase builds on previous research
- Context isolation prevents information mixing
- Variables flow naturally between contexts

**Quality Assessment:**
- Confidence tracking throughout the process
- Multi-dimensional quality evaluation
- Transparent uncertainty handling

**Real-World Applications:**
- Academic research automation
- Market research and analysis
- Policy research and recommendations
- Technical feasibility studies
- Competitive intelligence gathering

**Scalability Features:**
- Modular design allows phase customization
- Easy to add specialized analysis contexts
- Confidence thresholds can be adjusted per domain`
    },
    'sentiment-analysis': {
      code: `// Real-Time Sentiment Analysis Pipeline
// Processes user feedback with confidence-based routing

user_input = "I absolutely love this new feature! It's made my workflow so much easier and faster."
input_source = "product_review"
analysis_depth = "detailed"

// Multi-dimensional sentiment analysis
in context SentimentAnalysis {
  // Primary sentiment classification  
  primary_sentiment = llm("Classify sentiment as positive, negative, or neutral: " + user_input)
  
  // Emotional intensity scoring
  intensity_score = llm("Rate emotional intensity from 1-10 for: " + user_input)
  
  // Specific emotion detection
  emotions_detected = llm("What specific emotions are expressed in: " + user_input + 
                         " (joy, anger, frustration, excitement, etc.)")
  
  // Confidence in sentiment assessment
  sentiment_confidence = llm("Rate your confidence (0-1) in this sentiment analysis: " + primary_sentiment)
}

// Extract confidence score and create confident sentiment
confidence_value = 0.85  // This would be extracted from sentiment_confidence in real implementation
sentiment_result = primary_sentiment ~> confidence_value

// Advanced analysis based on confidence
analysis_detail = ""
follow_up_action = ""
priority_level = ""

uncertain if (sentiment_result ~> 0.7) {
  high {
    // High confidence - detailed analysis
    in context DetailedAnalysis {
      // Extract key themes
      key_themes = llm("Extract key themes and topics from: " + user_input)
      
      // Feature-specific feedback
      feature_feedback = llm("Identify specific product features mentioned in: " + user_input)
      
      // Actionable insights
      actionable_insights = llm("What actionable insights can be derived from: " + user_input + 
                               " for product improvement?")
    }
    
    analysis_detail = "DETAILED: " + key_themes + " | Features: " + feature_feedback + " | Insights: " + actionable_insights
    follow_up_action = "Route to product team for feature enhancement planning"
    priority_level = "HIGH"
  }
  medium {
    // Medium confidence - standard analysis
    analysis_detail = "STANDARD: Sentiment classified as " + primary_sentiment + 
                     " with emotions: " + emotions_detected
    follow_up_action = "Add to sentiment tracking dashboard, consider for weekly review"
    priority_level = "MEDIUM"
  }
  low {
    // Low confidence - flag for manual review
    analysis_detail = "UNCERTAIN: Sentiment unclear, requires human interpretation"
    follow_up_action = "Flag for manual review by customer success team"
    priority_level = "REVIEW_REQUIRED"
  }
}

// Response generation based on sentiment
response_strategy = ""

uncertain if (sentiment_result ~> 0.8) {
  high {
    if (primary_sentiment == "positive") {
      response_strategy = "Thank customer and ask for detailed feedback on specific features"
    } else if (primary_sentiment == "negative") {
      response_strategy = "Immediate outreach to address concerns and offer solutions"
    } else {
      response_strategy = "Follow up to understand customer needs better"
    }
  }
  medium {
    response_strategy = "Standard acknowledgment with option for further feedback"
  }
  low {
    response_strategy = "Human agent review before response"
  }
}

// Compile sentiment analysis report
sentiment_report = "SENTIMENT ANALYSIS REPORT\\n" +
                  "Input Source: " + input_source + "\\n" +
                  "User Input: " + user_input + "\\n\\n" +
                  "ANALYSIS RESULTS\\n" +
                  "Primary Sentiment: " + primary_sentiment + "\\n" +
                  "Confidence Level: " + sentiment_result + "\\n" +
                  "Emotional Intensity: " + intensity_score + "\\n" +
                  "Emotions Detected: " + emotions_detected + "\\n\\n" +
                  "DETAILED ANALYSIS\\n" + analysis_detail + "\\n\\n" +
                  "RECOMMENDED ACTIONS\\n" +
                  "Follow-up: " + follow_up_action + "\\n" +
                  "Priority: " + priority_level + "\\n" +
                  "Response Strategy: " + response_strategy

sentiment_report`,
      explanation: `This sentiment analysis pipeline showcases:

**Multi-Layered Sentiment Processing:**
- Primary sentiment classification (positive/negative/neutral)
- Emotional intensity measurement  
- Specific emotion detection
- Confidence assessment of the analysis

**Adaptive Analysis Depth:**
- **High Confidence**: Deep analysis with theme extraction
- **Medium Confidence**: Standard sentiment processing
- **Low Confidence**: Human review flagging

**Automated Response Routing:**
- Positive feedback → Product team for enhancement ideas
- Negative feedback → Customer success for immediate action
- Uncertain feedback → Human review queue

**Real-World Applications:**
- Customer feedback processing
- Social media monitoring
- Product review analysis
- Support ticket triage
- Brand sentiment tracking

**Business Value:**
- Faster response to customer concerns
- Automatic identification of product improvement opportunities
- Scalable customer feedback processing
- Confidence-aware decision making`
    },
    'financial-advisor': {
      code: `// AI Financial Advisory Bot
// Investment advice with risk assessment and confidence scoring

// Client profile and query
client_age = 35
risk_tolerance = "moderate"
investment_amount = 50000
investment_timeline = "10-15 years"
financial_goals = "retirement planning and wealth building"
market_experience = "intermediate"

client_query = "Should I invest in tech stocks given the current market conditions?"

// Comprehensive financial analysis
in context MarketAnalysis {
  // Current market conditions
  market_analysis = llm("Analyze current tech stock market conditions and trends")
  
  // Risk assessment for tech sector
  tech_risk_assessment = llm("Assess risks and volatility in tech sector for investment timeline: " + investment_timeline)
  
  // Market timing considerations
  timing_analysis = llm("Analyze market timing for tech stock investment given: " + market_analysis)
}

in context ClientSuitability {
  // Client profile analysis
  suitability_assessment = llm("Assess investment suitability for client: age " + client_age + 
                               ", risk tolerance " + risk_tolerance + 
                               ", experience level " + investment_timeline + 
                               ", goals: " + financial_goals)
  
  // Portfolio diversification advice
  diversification_advice = llm("Recommend portfolio diversification strategy for " + investment_amount + 
                              " investment with " + risk_tolerance + " risk tolerance")
  
  // Alternative investment options
  alternatives = llm("Suggest alternative investments to tech stocks for client profile: " + suitability_assessment)
}

// Generate investment recommendation with confidence
investment_recommendation = llm("Based on market analysis: " + market_analysis + 
                               " and client suitability: " + suitability_assessment + 
                               " and risk assessment: " + tech_risk_assessment + 
                               " - provide specific investment recommendation for: " + client_query)

// Confidence assessment of recommendation
recommendation_confidence = investment_recommendation ~> 0.75

// Risk-adjusted advice based on confidence
final_advice = ""
risk_warning = ""
action_plan = ""

uncertain if (recommendation_confidence ~> 0.7) {
  high {
    // High confidence recommendation
    final_advice = "RECOMMENDED: " + investment_recommendation
    risk_warning = "Standard risk disclosures apply. Past performance doesn't guarantee future results."
    action_plan = "Proceed with recommended allocation. Review quarterly and rebalance as needed."
  }
  medium {
    // Medium confidence - more cautious approach
    final_advice = "CONDITIONAL RECOMMENDATION: " + investment_recommendation + 
                  " Consider starting with smaller allocation (25-50% of planned amount)"
    risk_warning = "ELEVATED UNCERTAINTY: Market conditions show mixed signals. Monitor closely."
    action_plan = "Start with conservative allocation. Increase gradually as market clarity improves."
  }
  low {
    // Low confidence - recommend delay or consultation
    final_advice = "RECOMMENDATION DELAYED: Market uncertainty too high for confident recommendation"
    risk_warning = "HIGH UNCERTAINTY: Recommend waiting for clearer market signals or seeking additional professional consultation"
    action_plan = "Delay investment decision for 30-60 days. Consider consultation with certified financial planner."
  }
}

// Additional considerations based on client profile
additional_advice = ""

if (client_age < 40 && risk_tolerance == "moderate") {
  additional_advice = "Given your age and risk tolerance, consider higher growth allocation with appropriate diversification"
} else if (investment_timeline == "10-15 years") {
  additional_advice = "Long timeline allows for riding out market volatility - consider dollar-cost averaging strategy"
} else {
  additional_advice = "Maintain balanced approach aligned with stated risk tolerance"
}

// Compile comprehensive financial advice report
financial_advice_report = "FINANCIAL ADVISORY REPORT\\n" +
                         "Client Profile: Age " + client_age + ", " + risk_tolerance + " risk tolerance\\n" +
                         "Investment Amount: $" + investment_amount + "\\n" +
                         "Timeline: " + investment_timeline + "\\n" +
                         "Goals: " + financial_goals + "\\n\\n" +
                         "MARKET ANALYSIS\\n" + market_analysis + "\\n\\n" +
                         "INVESTMENT RECOMMENDATION\\n" + final_advice + "\\n\\n" +
                         "RISK ASSESSMENT\\n" + risk_warning + "\\n\\n" +
                         "ACTION PLAN\\n" + action_plan + "\\n\\n" +
                         "ADDITIONAL CONSIDERATIONS\\n" + additional_advice + "\\n\\n" +
                         "DIVERSIFICATION STRATEGY\\n" + diversification_advice + "\\n\\n" +
                         "ALTERNATIVE OPTIONS\\n" + alternatives

financial_advice_report`,
      explanation: `This financial advisory bot demonstrates:

**Comprehensive Risk Assessment:**
- Market condition analysis with current trends
- Client suitability evaluation based on profile
- Risk tolerance and timeline considerations
- Alternative investment evaluation

**Confidence-Based Advisory:**
- **High Confidence**: Clear recommendations with standard risk disclosure
- **Medium Confidence**: Conditional advice with reduced allocation suggestions  
- **Low Confidence**: Delay recommendations pending market clarity

**Multi-Context Analysis:**
- **MarketAnalysis**: External market factors and timing
- **ClientSuitability**: Personal financial profile assessment
- Integrated recommendation synthesis

**Regulatory Compliance Features:**
- Appropriate risk warnings based on confidence levels
- Documentation of reasoning and analysis process
- Clear action plans with timeline recommendations

**Real-World Applications:**
- Robo-advisor platforms
- Financial planning tools
- Investment recommendation engines
- Risk assessment systems
- Portfolio rebalancing automation

**Ethical AI Considerations:**
- Transparent confidence scoring
- Conservative approach when uncertain
- Human oversight recommendations for complex cases`
    },
    'code-reviewer': {
      code: `// AI Code Reviewer
// Automated code review with confidence scoring and detailed feedback

code_to_review = \`
function calculateUserScore(user) {
  let score = 0;
  if (user.activities) {
    for (let activity of user.activities) {
      score += activity.points || 0;
    }
  }
  return score;
}
\`

code_language = "javascript"
review_type = "security_and_quality"
project_context = "user scoring system for web application"

// Multi-dimensional code analysis
in context SecurityAnalysis {
  // Security vulnerability check
  security_assessment = llm("Analyze this " + code_language + " code for security vulnerabilities: " + code_to_review)
  
  // Input validation analysis
  input_validation = llm("Check input validation and error handling in: " + code_to_review)
  
  // Data sanitization review
  data_safety = llm("Review data handling and sanitization practices: " + code_to_review)
}

in context QualityAnalysis {
  // Code quality and best practices
  quality_assessment = llm("Review code quality, best practices, and maintainability: " + code_to_review)
  
  // Performance considerations
  performance_review = llm("Analyze performance implications and optimization opportunities: " + code_to_review)
  
  // Error handling assessment
  error_handling = llm("Evaluate error handling robustness: " + code_to_review)
}

in context StyleAndStructure {
  // Code style and formatting
  style_review = llm("Review code style, naming conventions, and formatting: " + code_to_review)
  
  // Code structure and organization
  structure_review = llm("Assess code structure, modularity, and organization: " + code_to_review)
  
  // Documentation and comments
  documentation_review = llm("Evaluate code documentation and comment quality: " + code_to_review)
}

// Comprehensive review synthesis
comprehensive_review = llm("Synthesize code review findings. Security: " + security_assessment + 
                          " | Quality: " + quality_assessment + 
                          " | Performance: " + performance_review + 
                          " | Style: " + style_review + 
                          " | Structure: " + structure_review + 
                          " - Provide overall assessment and priority recommendations")

// Confidence assessment of review
review_confidence = comprehensive_review ~> 0.8

// Generate recommendations based on confidence
review_status = ""
action_required = ""
approval_recommendation = ""

uncertain if (review_confidence ~> 0.7) {
  high {
    // High confidence review - detailed recommendations
    in context DetailedRecommendations {
      // Specific improvement suggestions
      improvements = llm("Provide specific, actionable code improvements for: " + code_to_review + 
                        " based on review: " + comprehensive_review)
      
      // Priority ranking of issues
      priority_issues = llm("Rank identified issues by priority (critical, high, medium, low): " + comprehensive_review)
      
      // Code examples for fixes
      fix_examples = llm("Provide code examples for fixing top 3 issues in: " + comprehensive_review)
    }
    
    review_status = "COMPREHENSIVE REVIEW COMPLETED"
    action_required = improvements + " | Priority Issues: " + priority_issues
    approval_recommendation = "Review complete. Address priority issues before merge."
  }
  medium {
    // Medium confidence - flag for human reviewer
    review_status = "AUTOMATED REVIEW WITH UNCERTAINTY"
    action_required = "Automated analysis complete but confidence below threshold. Human reviewer should validate findings."
    approval_recommendation = "Requires senior developer review before approval"
  }
  low {
    // Low confidence - escalate to human
    review_status = "REVIEW REQUIRES HUMAN EXPERTISE"
    action_required = "Code complexity or context requires human expert review. AI analysis inconclusive."
    approval_recommendation = "Escalate to tech lead or senior developer for comprehensive review"
  }
}

// Risk assessment for deployment
deployment_risk = ""

uncertain if (review_confidence ~> 0.8) {
  high {
    if (security_assessment.includes("vulnerability") || security_assessment.includes("risk")) {
      deployment_risk = "HIGH RISK: Security concerns identified. Do not deploy without fixes."
    } else if (performance_review.includes("performance") && performance_review.includes("issue")) {
      deployment_risk = "MEDIUM RISK: Performance issues may impact user experience"
    } else {
      deployment_risk = "LOW RISK: Code meets basic quality and security standards"
    }
  }
  medium {
    deployment_risk = "MEDIUM RISK: Review confidence below threshold. Recommend additional testing."
  }
  low {
    deployment_risk = "HIGH RISK: Uncertain analysis. Manual review required before deployment."
  }
}

// Generate comprehensive code review report
code_review_report = "AUTOMATED CODE REVIEW REPORT\\n" +
                    "Code Language: " + code_language + "\\n" +
                    "Review Type: " + review_type + "\\n" +
                    "Project Context: " + project_context + "\\n\\n" +
                    "REVIEW STATUS\\n" + review_status + "\\n\\n" +
                    "SECURITY ANALYSIS\\n" + security_assessment + "\\n\\n" +
                    "QUALITY ASSESSMENT\\n" + quality_assessment + "\\n\\n" +
                    "PERFORMANCE REVIEW\\n" + performance_review + "\\n\\n" +
                    "STYLE AND STRUCTURE\\n" + style_review + " | " + structure_review + "\\n\\n" +
                    "COMPREHENSIVE ASSESSMENT\\n" + comprehensive_review + "\\n\\n" +
                    "ACTION REQUIRED\\n" + action_required + "\\n\\n" +
                    "DEPLOYMENT RISK\\n" + deployment_risk + "\\n\\n" +
                    "APPROVAL RECOMMENDATION\\n" + approval_recommendation

code_review_report`,
      explanation: `This AI code reviewer showcases advanced code analysis:

**Multi-Dimensional Analysis:**
- **SecurityAnalysis**: Vulnerability detection and input validation
- **QualityAnalysis**: Best practices and maintainability  
- **StyleAndStructure**: Formatting and organizational standards

**Confidence-Driven Workflow:**
- **High Confidence**: Detailed recommendations with fix examples
- **Medium Confidence**: Flag for human validation
- **Low Confidence**: Escalate to senior developers

**Risk-Based Deployment Decisions:**
- Security vulnerabilities block deployment
- Performance issues trigger additional testing
- Quality issues get prioritized feedback

**Integration-Ready Features:**
- Structured output for CI/CD pipeline integration
- Priority ranking for issue tracking systems
- Confidence scores for automated decision making

**Real-World Applications:**
- Pull request automation
- Pre-commit hooks
- CI/CD pipeline integration
- Code quality gates
- Security compliance checking

**Development Workflow Enhancement:**
- Faster code review cycles
- Consistent quality standards
- Security vulnerability prevention
- Knowledge sharing through explanations`
    }
  };

  return (
    <div className="examples-page">
      <div className="examples-header">
        <h1>Prism Examples</h1>
        <p>Explore real-world applications of Prism's uncertainty-aware programming paradigm</p>
      </div>

      <div className="examples-container">
        <nav className="examples-sidebar">
          <h3>Examples</h3>
          <div className="examples-nav">
            {examples.map(example => (
              <button
                key={example.id}
                className={`example-item ${activeExample === example.id ? 'active' : ''}`}
                onClick={() => setActiveExample(example.id)}
              >
                <div className="example-category">{example.category}</div>
                <div className="example-title">{example.title}</div>
                <div className="example-description">{example.description}</div>
              </button>
            ))}
          </div>
        </nav>

        <main className="examples-content">
          {exampleContent[activeExample as keyof typeof exampleContent] && (
            <div className="example-detail">
              <div className="example-header-detail">
                <h2>{examples.find(e => e.id === activeExample)?.title}</h2>
                <span className="category-badge">
                  {examples.find(e => e.id === activeExample)?.category}
                </span>
              </div>
              
              <p className="example-description-detail">
                {examples.find(e => e.id === activeExample)?.description}
              </p>

              <div className="code-section">
                <h3>Implementation</h3>
                <CodeBlock 
                  code={exampleContent[activeExample as keyof typeof exampleContent].code}
                  language="prism"
                  title={`${activeExample}.prism`}
                />
              </div>

              <div className="explanation-section">
                <h3>Explanation</h3>
                <div className="explanation-content">
                  {exampleContent[activeExample as keyof typeof exampleContent].explanation.split('\n').map((paragraph, index) => {
                    if (paragraph.startsWith('**') && paragraph.endsWith(':**')) {
                      return <h4 key={index}>{paragraph.slice(2, -2)}</h4>;
                    }
                    if (paragraph.startsWith('- **') && paragraph.includes('**:')) {
                      const parts = paragraph.split('**:');
                      return (
                        <li key={index}>
                          <strong>{parts[0].slice(3)}</strong>: {parts[1]}
                        </li>
                      );
                    }
                    if (paragraph.startsWith('- ')) {
                      return <li key={index}>{paragraph.slice(2)}</li>;
                    }
                    if (paragraph.trim() === '') {
                      return <br key={index} />;
                    }
                    return <p key={index}>{paragraph}</p>;
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ExamplesPage;