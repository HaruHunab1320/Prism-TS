import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './CodeBlock.css';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'javascript', title }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    // You could add a toast notification here
  };

  // Map our custom languages to supported ones
  const getLanguage = (lang: string) => {
    switch (lang) {
      case 'prism':
        return 'javascript'; // Use JavaScript highlighting for Prism code
      case 'bash':
        return 'bash';
      case 'env':
        return 'bash';
      case 'output':
        return 'text';
      default:
        return lang;
    }
  };

  return (
    <div className="code-block">
      {title && (
        <div className="code-header">
          <span className="code-title">{title}</span>
          <button className="copy-button" onClick={copyToClipboard}>
            Copy
          </button>
        </div>
      )}
      <SyntaxHighlighter
        language={getLanguage(language)}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          borderRadius: title ? '0 0 8px 8px' : '8px',
        }}
        showLineNumbers={false}
        wrapLines={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;