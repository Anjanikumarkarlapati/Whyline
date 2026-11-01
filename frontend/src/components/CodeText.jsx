import React, { useState } from 'react';
import { Check, Copy } from '@phosphor-icons/react';

/**
 * Renders inline backticks (`code`) as proper <code className="inline-code"> elements
 * so raw backticks never appear in paragraphs or summaries.
 */
export function FormattedText({ text }) {
  if (!text) return null;
  const parts = String(text).split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code key={idx} className="inline-code">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Standardized Code Block with mono font, tinted background, and Copy button.
 */
export function CodeBlock({ code, label = 'Source snippet' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span>{label}</span>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }}
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <>
              <Check size={14} weight="regular" aria-hidden="true" />
              <span role="status" aria-live="polite">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} weight="regular" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-block">{code}</pre>
    </div>
  );
}
