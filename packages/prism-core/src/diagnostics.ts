export type DiagnosticLevel = 'error' | 'warning' | 'note';

export interface SourcePosition {
  line: number;
  column: number;
}

export interface SourceSpan {
  file?: string;
  start: SourcePosition;
  end: SourcePosition;
}

export interface DiagnosticLabel {
  span: SourceSpan;
  message?: string;
  kind?: 'primary' | 'secondary';
}

export interface Diagnostic {
  level: DiagnosticLevel;
  message: string;
  code?: string;
  span?: SourceSpan;
  labels?: DiagnosticLabel[];
  notes?: string[];
  help?: string;
}

export class DiagnosticError extends Error {
  public diagnostic: Diagnostic;

  constructor(diagnostic: Diagnostic, source?: string) {
    super(formatDiagnostic(diagnostic, source));
    this.diagnostic = diagnostic;
    this.name = 'DiagnosticError';
  }
}

export function formatDiagnostic(diagnostic: Diagnostic, source?: string): string {
  const level = diagnostic.level.toUpperCase();
  const code = diagnostic.code ? `[${diagnostic.code}] ` : '';
  const header = `${level}: ${code}${diagnostic.message}`;

  if (!diagnostic.span || !source) {
    return header;
  }

  const { line, column } = diagnostic.span.start;
  const file = diagnostic.span.file ? `${diagnostic.span.file}:` : '';
  const locationHeader = ` --> ${file}${line}:${column}`;
  const lines = source.split('\n');
  const errorLine = lines[line - 1] ?? '';
  const caretColumn = Math.max(column - 1, 0);
  const underlineLength = Math.max(
    (diagnostic.span.end.column ?? column) - column,
    1
  );
  const underline = ' '.repeat(caretColumn) + '^'.repeat(underlineLength);

  let formatted = `${header}\n${locationHeader}\n\n  ${line} | ${errorLine}\n    | ${underline}`;

  if (diagnostic.help) {
    formatted += `\nhelp: ${diagnostic.help}`;
  }
  if (diagnostic.notes && diagnostic.notes.length > 0) {
    diagnostic.notes.forEach((note) => {
      formatted += `\nnote: ${note}`;
    });
  }

  return formatted;
}
