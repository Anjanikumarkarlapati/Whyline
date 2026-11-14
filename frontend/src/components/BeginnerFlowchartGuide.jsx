import React from 'react';
import {
  ArrowRight,
  Compass,
  FileCode,
  Info,
  ShieldCheck,
  SpeakerHigh,
  Stop,
} from '@phosphor-icons/react';
import { useVoiceAgent } from '../context/VoiceAgentContext';

function getBeginnerRoleMeta(step = {}, idx = 0, total = 1) {
  const titleAndCat = `${step.title || ''} ${step.category || ''} ${step.phase || ''}`.toLowerCase();
  const fullText = `${titleAndCat} ${step.file_path || ''}`.toLowerCase();

  if (/fence|guard|auth|check|policy|valid|middleware|security|jwt|token/.test(titleAndCat)) {
    return {
      role: 'Safety & Security Guard',
      input: 'Incoming data or proposed code change',
      output: 'Approved payload or blocked warning',
      why: 'Protects critical rules and stops unsafe or unauthorized changes before they reach data.',
    };
  }
  if (idx === 0 || /entry|route|server|app|index|main|page|ui|checkout|dispatch/.test(titleAndCat)) {
    return {
      role: 'Front Door (Entry Point)',
      input: 'User action or incoming HTTP request',
      output: 'Validated request passed to the next module',
      why: 'Without an entry point, requests have nowhere to land or be routed to the right handler.',
    };
  }
  if (/db|sql|store|cache|vector|pg|memory|repo|model|schema|outbox|dedup/.test(fullText)) {
    return {
      role: 'Filing Cabinet (Data & Memory)',
      input: 'Structured query or record to save',
      output: 'Stored facts, files, or search results',
      why: 'Keeps repository history, answers, and state durable instead of losing everything on refresh.',
    };
  }
  if (/voice|tts|stt|gnani|audio|ai|llm|gemini|api|external|gpu|dicom/.test(fullText)) {
    return {
      role: 'Specialist Helper (API / Engine)',
      input: 'Text prompt, payload, or media frame',
      output: 'Processed output or external service response',
      why: 'Connects your app to specialized engines without bloating core business logic.',
    };
  }
  if (idx === total - 1 || /deploy|build|test|audit|output|render|response/.test(fullText)) {
    return {
      role: 'Final Delivery & Verification',
      input: 'Processed result from core modules',
      output: 'Rendered UI, spoken reply, or pass/fail check',
      why: 'Ensures the user sees a clear result and catches regressions before code ships.',
    };
  }
  return {
    role: 'Core Worker (Business Logic)',
    input: 'Cleaned inputs from the previous step',
    output: 'Transformed data ready for storage or display',
    why: 'Holds the main rules of how this feature works so each part stays organized and testable.',
  };
}

export default function BeginnerFlowchartGuide({
  steps = [],
  activeIndex = 0,
  onSelectStep,
  onInspectCode,
}) {
  const { selectedAgent, speakText, stopSpeaking, isSpeaking } = useVoiceAgent();

  if (!steps.length) return null;

  const safeIndex = Math.max(0, Math.min(activeIndex, steps.length - 1));
  const current = steps[safeIndex] || steps[0];
  const meta = getBeginnerRoleMeta(current, safeIndex, steps.length);
  const cleanTitle = String(current.title || current.label || `Step ${safeIndex + 1}`)
    .replace(/^\s*(?:step\s*)?\d+\s*[.:)-]\s*/i, '')
    .trim();
  const detailText =
    current.explanation ||
    current.summary ||
    current.description ||
    current.spoken_script ||
    `This step handles ${cleanTitle} inside ${current.file_path || 'the repository'}.`;

  const spokenSummary = `Step ${safeIndex + 1}: ${cleanTitle}. Role: ${meta.role}. ${detailText}`;

  return (
    <section
      aria-label="Beginner-friendly flowchart guide"
      data-testid="beginner-flowchart-guide"
      className="glass reveal-stagger"
      style={{
        '--stagger': 1,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header + 3-Chip Reading Key */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={19} weight="bold" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="card-title" style={{ margin: 0, fontSize: 'var(--type-md)' }}>
            Beginner&apos;s Guide to This Flowchart
          </h3>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span className="badge" style={{ padding: '4px 10px', borderRadius: '999px', background: 'var(--bg-raised)' }}>
            1. Boxes = Code jobs
          </span>
          <span className="badge" style={{ padding: '4px 10px', borderRadius: '999px', background: 'var(--bg-raised)' }}>
            2. Glowing arrows = Data direction
          </span>
          <span className="badge" style={{ padding: '4px 10px', borderRadius: '999px', background: 'var(--bg-raised)' }}>
            3. Click any box to inspect
          </span>
        </div>
      </div>

      {/* Active Step Deep-Dive Card */}
      <article
        className="glass-strong"
        style={{
          padding: '18px',
          borderRadius: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                className="badge"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '999px',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                }}
              >
                Step {safeIndex + 1} of {steps.length}
              </span>
              <span
                className="badge"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: '999px',
                  background: 'var(--accent-wash)',
                  color: 'var(--text-primary)',
                }}
              >
                {meta.role}
              </span>
            </div>
            <h4 style={{ margin: '4px 0 0 0', fontSize: 'var(--type-lg)', color: 'var(--text-primary)' }}>
              {cleanTitle}
            </h4>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-testid="beginner-guide-speak-btn"
            onClick={() => (isSpeaking ? stopSpeaking() : speakText(spokenSummary))}
          >
            {isSpeaking ? <Stop size={14} weight="fill" aria-hidden="true" /> : <SpeakerHigh size={14} aria-hidden="true" />}
            <span>{isSpeaking ? 'Stop Voice' : `Explain with ${selectedAgent.displayName}`}</span>
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-primary)', lineHeight: 1.65 }}>
          {detailText}
        </p>

        {/* Input -> Action -> Output 3-Column Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
          }}
        >
          <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              1. What Goes In
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{meta.input}</div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowRight size={12} aria-hidden="true" />
              2. What Happens Here
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{cleanTitle}</div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              3. What Comes Out
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{meta.output}</div>
          </div>
        </div>

        {/* Why it matters + Code Location */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', flex: '1 1 280px' }}>
            <ShieldCheck size={16} weight="regular" style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Why it matters:</strong> {meta.why}
            </span>
          </div>

          {current.file_path && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onInspectCode?.(current)}
            >
              <FileCode size={14} aria-hidden="true" />
              <code className="mono-metric">
                {current.file_path}:{current.line_start || current.target_line || 1}
              </code>
            </button>
          )}
        </div>
      </article>

      {/* Step Selector Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} role="tablist" aria-label="Flowchart steps">
        {steps.map((s, idx) => {
          const active = idx === safeIndex;
          const label = String(s.title || s.label || `Step ${idx + 1}`)
            .replace(/^\s*(?:step\s*)?\d+\s*[.:)-]\s*/i, '')
            .trim();
          return (
            <button
              key={s.id || idx}
              type="button"
              role="tab"
              aria-selected={active}
              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onSelectStep?.(s, idx)}
            >
              <span>{idx + 1}. {label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <Info size={14} aria-hidden="true" />
        <span>Tip: Use Arrow keys on the diagram or click any numbered step above to trace the data flow.</span>
      </div>
    </section>
  );
}
