// Prism language definition for syntax highlighting
Prism.languages.prism = {
  'comment': {
    pattern: /\/\/.*/,
    greedy: true
  },
  'string': {
    pattern: /"(?:[^"\\]|\\.)*"/,
    greedy: true
  },
  'number': /\b\d+(?:\.\d+)?\b/,
  'confidence': {
    pattern: /~[>@?]/,
    alias: 'operator'
  },
  'operator': /[+\-*\/%=<>!&|]+/,
  'keyword': /\b(?:uncertain|if|high|medium|low|llm|import|from|as)\b/,
  'function': /\b(?:confidence|extract|combine)\b(?=\s*\()/,
  'variable': /\b[a-zA-Z_]\w*\b/,
  'punctuation': /[{}[\];(),.:]/
};

Prism.languages.prism['class-name'] = Prism.languages.prism.variable;