import { parse } from '../core/parser';
import { Runtime, Value, NumberValue, StringValue, BooleanValue, ConfidenceValue as RuntimeConfidenceValue } from '../core/runtime';
import { LLMProvider, LLMConfigManager } from '../llm';

export interface REPLSuccessResult {
  success: true;
  value: string;
  type: string;
  shouldExit?: boolean;
}

export interface REPLErrorResult {
  success: false;
  error: string;
  shouldExit?: boolean;
}

export type REPLResult = REPLSuccessResult | REPLErrorResult;

export interface REPLError extends Error {
  code?: string;
}

export interface HistoryEntry {
  input: string;
  result: REPLResult;
  timestamp: Date;
}

export interface SessionStats {
  totalEvaluations: number;
  successfulEvaluations: number;
  errors: number;
  variablesCount: number;
  startTime: Date;
  uptime: number; // in milliseconds
}

export class PrismREPL {
  private runtime: Runtime;
  private history: HistoryEntry[] = [];
  private startTime: Date;
  private variables = new Map<string, Value>();

  constructor() {
    this.runtime = new Runtime();
    this.startTime = new Date();
  }

  registerLLMProvider(name: string, provider: LLMProvider): void {
    this.runtime.registerLLMProvider(name, provider);
  }

  setDefaultLLMProvider(name: string): void {
    this.runtime.setDefaultLLMProvider(name);
  }

  async evaluate(input: string): Promise<REPLResult> {
    const trimmedInput = input.trim();
    
    // Handle REPL commands
    if (trimmedInput.startsWith(':')) {
      return this.handleCommand(trimmedInput);
    }

    if (!trimmedInput) {
      return { success: true, value: '', type: 'empty' };
    }

    try {
      // Parse the input
      const program = parse(trimmedInput);
      
      // Execute the program
      const result = await this.runtime.execute(program);
      
      // Update variables tracking (simplified approach)
      this.trackVariablesFromInput(trimmedInput, result);
      
      // Format the result for display
      const formattedResult = this.formatValue(result);
      
      const replResult: REPLSuccessResult = {
        success: true,
        value: formattedResult.value,
        type: formattedResult.type,
      };

      // Add to history
      this.addToHistory(trimmedInput, replResult);
      
      return replResult;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const replResult: REPLErrorResult = {
        success: false,
        error: errorMessage,
      };

      // Add to history
      this.addToHistory(trimmedInput, replResult);
      
      return replResult;
    }
  }

  private handleCommand(command: string): REPLResult {
    const cmd = command.toLowerCase();

    switch (cmd) {
      case ':help':
        return {
          success: true,
          value: this.getHelpText(),
          type: 'help',
        };

      case ':vars':
        return {
          success: true,
          value: this.getVariablesText(),
          type: 'vars',
        };

      case ':clear':
        this.clearSession();
        return {
          success: true,
          value: 'Session cleared. All variables and history removed.',
          type: 'info',
        };

      case ':history':
        return {
          success: true,
          value: this.getHistoryText(),
          type: 'history',
        };

      case ':stats':
        return {
          success: true,
          value: this.getStatsText(),
          type: 'stats',
        };

      case ':llm':
        return {
          success: true,
          value: this.getLLMText(),
          type: 'llm',
        };

      case ':exit':
      case ':quit':
        return {
          success: true,
          value: 'Goodbye! Thanks for using Prism! 🚀',
          type: 'exit',
          shouldExit: true,
        };

      default:
        return {
          success: false,
          error: `Unknown command: ${command}. Type :help for available commands.`,
        };
    }
  }

  private formatValue(value: Value): { value: string; type: string } {
    if (value instanceof NumberValue) {
      return { value: value.value.toString(), type: 'number' };
    }
    
    if (value instanceof StringValue) {
      return { value: value.value, type: 'string' };
    }
    
    if (value instanceof BooleanValue) {
      return { value: value.value.toString(), type: 'boolean' };
    }
    
    if (value instanceof RuntimeConfidenceValue) {
      const innerResult = this.formatValue(value.value);
      return { 
        value: `${innerResult.value} (~${(value.confidence.value * 100).toFixed(1)}%)`,
        type: 'confident'
      };
    }

    return { value: value.toString(), type: value.type };
  }

  private trackVariablesFromInput(input: string, result: Value): void {
    // Simple pattern matching for assignments
    const assignmentMatch = input.match(/^\s*(\w+)\s*=/);
    if (assignmentMatch) {
      const variableName = assignmentMatch[1];
      this.variables.set(variableName, result);
    }
  }

  private addToHistory(input: string, result: REPLResult): void {
    this.history.push({
      input,
      result,
      timestamp: new Date(),
    });

    // Keep history limited to last 100 entries
    if (this.history.length > 100) {
      this.history.shift();
    }
  }

  private clearSession(): void {
    this.runtime = new Runtime();
    this.variables.clear();
    this.history = [];
    
    // Re-register any LLM providers that were set up
    // Note: In a real implementation, we'd want to preserve provider configuration
  }

  private getHelpText(): string {
    return `
🌟 Prism REPL Commands 🌟

Basic Usage:
  Simply type Prism expressions and press Enter
  Example: 2 + 3
  Example: llm("Hello AI!")
  Example: x = 42 ~> 0.9

Commands:
  :help     - Show this help message
  :vars     - Show all defined variables
  :clear    - Clear session (reset all variables)
  :history  - Show evaluation history
  :stats    - Show session statistics
  :llm      - Show LLM provider information
  :exit     - Exit the REPL

Language Features:
  • Arithmetic: +, -, *, /
  • Comparison: >, <, >=, <=, ==, !=
  • Confidence: value ~> confidence_level
  • LLM calls: llm("your prompt here")
  • Variables: name = value
  • Control flow: if/else, uncertain if
  • Contexts: in context Name { ... }

Examples:
  result = llm("What is AI?")
  
  uncertain if (result ~> 0.8) {
    high { confident_response = "High confidence!" }
    low { uncertain_response = "Need more info" }
  }
  
  in context Research {
    findings = llm("Research topic: " + topic)
  }

Happy coding with Prism! 🚀
    `.trim();
  }

  private getVariablesText(): string {
    if (this.variables.size === 0) {
      return 'No variables defined in current session.';
    }

    const varLines: string[] = ['📊 Current Variables:'];
    
    for (const [name, value] of this.variables) {
      const formatted = this.formatValue(value);
      varLines.push(`  ${name}: ${formatted.value} (${formatted.type})`);
    }

    return varLines.join('\n');
  }

  private getHistoryText(): string {
    if (this.history.length === 0) {
      return 'No evaluation history.';
    }

    const historyLines: string[] = ['📜 Evaluation History (last 10):'];
    
    // Show last 10 entries
    const recentHistory = this.history.slice(-10);
    
    recentHistory.forEach((entry, index) => {
      const timestamp = entry.timestamp.toLocaleTimeString();
      const status = entry.result.success ? '✅' : '❌';
      historyLines.push(`  ${index + 1}. [${timestamp}] ${status} ${entry.input}`);
      
      if (entry.result.success) {
        historyLines.push(`      → ${entry.result.value}`);
      } else {
        historyLines.push(`      → Error: ${entry.result.error}`);
      }
    });

    return historyLines.join('\n');
  }

  private getStatsText(): string {
    const stats = this.getSessionStats();
    
    return `
📈 Session Statistics

⏱️  Session Duration: ${Math.floor(stats.uptime / 1000)}s
🎯  Total Evaluations: ${stats.totalEvaluations}
✅  Successful: ${stats.successfulEvaluations}
❌  Errors: ${stats.errors}
📊  Success Rate: ${stats.totalEvaluations > 0 ? ((stats.successfulEvaluations / stats.totalEvaluations) * 100).toFixed(1) : 0}%
🗃️  Variables Defined: ${stats.variablesCount}
🕐  Started: ${stats.startTime.toLocaleString()}
    `.trim();
  }

  private getLLMText(): string {
    const availableProviders = LLMConfigManager.getAvailableProviders();
    const defaultProvider = LLMConfigManager.getDefaultProvider();
    const currentProvider = this.runtime.getDefaultLLMProvider();
    const configStatus = LLMConfigManager.getConfigStatus();
    
    return `
🤖 LLM Provider Information

Available Providers: ${availableProviders.join(', ')}
Default Provider: ${defaultProvider}
Current Provider: ${currentProvider || 'none'}

🔍 Configuration Status:
${configStatus.map(item => {
  const current = item.provider === currentProvider ? ' ← current' : '';
  const details = item.details ? `\n    ${item.details}` : '';
  return `  • ${item.provider}: ${item.status}${current}${details}`;
}).join('\n')}

Configuration Help:
${LLMConfigManager.showConfigHelp()}

Usage in Prism:
  result = llm("Your prompt here")
  response = llm("Question", { model: "claude-3-sonnet", temperature: 0.5 })
    `.trim();
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  getSessionStats(): SessionStats {
    const now = new Date();
    const successfulEvaluations = this.history.filter(h => h.result.success).length;
    
    return {
      totalEvaluations: this.history.length,
      successfulEvaluations,
      errors: this.history.length - successfulEvaluations,
      variablesCount: this.variables.size,
      startTime: this.startTime,
      uptime: now.getTime() - this.startTime.getTime(),
    };
  }

  // Method to create a formatted welcome message
  getWelcomeMessage(): string {
    return `
🌟 Welcome to Prism REPL! 🌟

Prism is a programming language designed for LLM orchestration and AI-aware computing.

Features available:
• 🧠 Confidence-aware programming with ~> operator
• 🤖 Built-in LLM integration with llm() function  
• 🔄 Context-aware execution environments
• 📊 Uncertainty handling with uncertain if statements
• 🎯 Agent coordination and management

Type :help for commands or start coding!
Examples: 
  → 2 + 3
  → llm("Hello AI!")
  → x = 42 ~> 0.9

Ready to explore the future of AI programming? Let's go! 🚀
    `.trim();
  }
}