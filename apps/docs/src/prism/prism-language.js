// Comprehensive Prism language definition for syntax highlighting
Prism.languages.prism = {
  'comment': {
    pattern: /\/\/.*/,
    greedy: true
  },
  
  // String handling with interpolation support
  'string': [
    {
      // Interpolated strings
      pattern: /"(?:[^"\\$]|\\.|\$\{(?:[^{}]|\{[^}]*\})*\})*"/,
      greedy: true,
      inside: {
        'interpolation': {
          pattern: /\$\{(?:[^{}]|\{[^}]*\})*\}/,
          inside: {
            'interpolation-punctuation': {
              pattern: /^\$\{|\}$/,
              alias: 'punctuation'
            },
            rest: Prism.languages.prism
          }
        },
        'string': /[\s\S]+/
      }
    },
    {
      // Regular strings
      pattern: /"(?:[^"\\]|\\.)*"/,
      greedy: true
    }
  ],

  // Numbers including decimals
  'number': /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/,

  // Boolean and null values
  'boolean': /\b(?:true|false)\b/,
  'null': /\b(?:null|undefined)\b/,

  // All keywords including uncertainty-specific ones
  'keyword': /\b(?:if|else|for|while|do|break|continue|function|return|let|const|typeof|instanceof|in|uncertain|high|medium|low|default|context|shifting|to|agents|agent|confidence)\b/,

  // Built-in functions
  'builtin': /\b(?:llm|extract|combine|print|console)\b/,

  // Confidence operators (most specific patterns first)
  'confidence-operator': [
    {
      pattern: /~\|\|>/,  // Parallel confidence
      alias: 'confidence-parallel'
    },
    {
      pattern: /~@>/,     // Threshold gate
      alias: 'confidence-threshold'
    },
    {
      pattern: /~\|>/,    // Confidence pipeline
      alias: 'confidence-pipeline'
    },
    {
      pattern: /~\?>/,    // Confidence threshold gate
      alias: 'confidence-gate'
    },
    {
      pattern: /~>|<~/,   // Confidence arrow and extract
      alias: 'confidence-arrow'
    },
    {
      pattern: /~~/,      // Confidence chain
      alias: 'confidence-chain'
    },
    {
      pattern: /~\?\?/,   // Confidence coalesce
      alias: 'confidence-coalesce'
    },
    {
      pattern: /~&&|~\|\|/, // Confidence logical
      alias: 'confidence-logical'
    },
    {
      pattern: /~[+\-*/%]/, // Confidence arithmetic
      alias: 'confidence-arithmetic'
    },
    {
      pattern: /~(?:==|!=|<=?|>=?)/, // Confidence comparison
      alias: 'confidence-comparison'
    },
    {
      pattern: /~\./,     // Confidence dot
      alias: 'confidence-dot'
    }
  ],

  // Regular operators (after confidence operators to avoid conflicts)
  'operator': [
    {
      pattern: /\|>/,    // Pipeline operator
      alias: 'pipeline'
    },
    {
      pattern: /\?\?/,   // Nullish coalescing
      alias: 'nullish'
    },
    {
      pattern: /\?\.?/,  // Optional chaining
      alias: 'optional-chain'
    },
    {
      pattern: /\.\.\./,  // Spread operator
      alias: 'spread'
    },
    {
      pattern: /=>|->/, // Arrow functions
      alias: 'arrow'
    },
    {
      pattern: /[+\-*/%]=?|[=!<>]=?|&&|\|\||!|&|\||\^|~|<<|>>|>>>|(\+\+|--)|\.\./, // All other operators
      alias: 'operator'
    }
  ],

  // Function definitions and calls
  'function': [
    {
      pattern: /\b[a-zA-Z_]\w*(?=\s*\()/,
      alias: 'function-name'
    }
  ],

  // Variables and identifiers
  'variable': {
    pattern: /\b[a-zA-Z_]\w*\b/,
    alias: 'identifier'
  },

  // Property names in object literals
  'property': {
    pattern: /(?:[a-zA-Z_]\w*|\[[^\]]+\])(?=\s*:)/,
    alias: 'property-name'
  },

  // Punctuation
  'punctuation': /[{}[\];(),.:]/,

  // Special placeholders
  'placeholder': {
    pattern: /\b_\b/,
    alias: 'special'
  }
};

// Add support for template literals
Prism.languages.insertBefore('prism', 'string', {
  'template-string': {
    pattern: /`(?:[^`\\$]|\\.|\$\{(?:[^{}]|\{[^}]*\})*\})*`/,
    greedy: true,
    inside: {
      'template-punctuation': {
        pattern: /^`|`$/,
        alias: 'string'
      },
      'interpolation': {
        pattern: /\$\{(?:[^{}]|\{[^}]*\})*\}/,
        inside: {
          'interpolation-punctuation': {
            pattern: /^\$\{|\}$/,
            alias: 'punctuation'
          },
          rest: Prism.languages.prism
        }
      },
      'string': /[\s\S]+/
    }
  }
});

// Ensure proper ordering
Prism.languages.prism['class-name'] = Prism.languages.prism.variable;