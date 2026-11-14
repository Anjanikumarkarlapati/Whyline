import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CaretLeft,
  CaretRight,
  ChatCircleText,
  FileCode,
  GitBranch,
  SpeakerHigh,
  Stop,
  X,
} from '@phosphor-icons/react';
import ErrorBoundary from '../components/ErrorBoundary';
import RepoFlowchartExplorer from '../components/RepoFlowchartExplorer';
import { useI18n } from '../i18n';
import { useWorkbenchSelection } from '../context/WorkbenchContext';
import { useVoiceAgent } from '../context/VoiceAgentContext';

const DEFAULT_TOUR_STEPS = [
  { id: 1, title: 'Entry & Routing', file_path: 'server.ts', line_start: 1, summary: 'HTTP requests enter the gateway, validate headers, and dispatch to route handlers.' },
  { id: 2, title: 'AST Fence Guard', file_path: 'src/ast/fenceGuard.ts', line_start: 42, summary: 'Spoken fences lock critical AST ranges before any agent edit is committed.' },
  { id: 3, title: 'Repo Indexer', file_path: 'src/repo/scanner.ts', line_start: 18, summary: 'Extracts file trees, blame history, and symbol links for hybrid RRF retrieval.' },
  { id: 4, title: 'Gnani Voice Pipeline', file_path: 'src/voice/gnani.ts', line_start: 12, summary: 'Streams Prisma STT and Timbre v3.0 TTS in English, Telugu, and Hindi.' },
  { id: 5, title: 'Verification & Audit', file_path: 'scripts/audit_design_system.py', line_start: 1, summary: 'Enforces Cream-and-Olive tokens, accessibility, and zero secret leaks.' },
];

export default function FlowchartsPage() {
  const { t } = useI18n();
  const { repoContext, selectLocation } = useWorkbenchSelection();
  const { selectedAgent, speakText, stopSpeaking, isSpeaking } = useVoiceAgent();

  const [activeTourIndex, setActiveTourIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);

  const activeStep = DEFAULT_TOUR_STEPS[activeTourIndex] || DEFAULT_TOUR_STEPS[0];

  const handleSelectStep = (step) => {
    if (!step) return;
    setSelectedNode({
      title: step.title || step.label || 'Architecture Node',
      file_path: step.file_path || 'src/index.ts',
      line_start: step.line_start || step.target_line || 1,
      summary: step.summary || step.description || step.explanation || '',
    });
    if (step.file_path) {
      const parsedLine =
        step.line_start ||
        step.target_line ||
        parseInt(String(step.line_range || '1').split('-')[0], 10) ||
        1;
      selectLocation({ file: step.file_path, line: parsedLine });
    }
  };

  return (
    <div
      className="flowchat-fullbleed"
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 130px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingBottom: '92px',
      }}
    >
      {/* Floating Glass Toolbar */}
      <div
        className="glass reveal-stagger"
        style={{
          '--stagger': 0,
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitBranch size={17} weight="bold" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <strong style={{ fontSize: 'var(--type-sm)' }}>{t('navFlowChat')}</strong>
          <code className="mono-metric" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {repoContext?.fullName || 'HealthConnect/payment-gateway-v1'}
          </code>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {selectedAgent.displayName} ({selectedAgent.languageLabel})
          </span>
          <Link to="/ask" className="btn btn-secondary btn-sm">
            <ChatCircleText size={15} aria-hidden="true" />
            <span>{t('navAskRepo')}</span>
          </Link>
        </div>
      </div>

      {/* Main Full-Bleed Flowchart Canvas */}
      <div className="flow-canvas-paths glass-sheet" style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
        <ErrorBoundary title="Flowchart Renderer Unavailable">
          <RepoFlowchartExplorer onSelectStep={handleSelectStep} />
        </ErrorBoundary>
      </div>

      {/* Glass Node Detail Sheet */}
      {selectedNode && (
        <aside
          className="glass-sheet reveal-stagger"
          role="dialog"
          aria-label={t('flowNodeDetails')}
          data-testid="flow-node-detail-sheet"
          style={{
            position: 'fixed',
            right: '20px',
            top: '96px',
            width: 'min(380px, calc(100vw - 32px))',
            padding: '18px',
            zIndex: 70,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <strong style={{ fontSize: 'var(--type-md)' }}>{selectedNode.title}</strong>
            <button
              type="button"
              className="btn btn-tertiary btn-icon"
              style={{ minWidth: '34px', minHeight: '34px' }}
              aria-label={t('closeMenuAria')}
              onClick={() => setSelectedNode(null)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
            <FileCode size={14} aria-hidden="true" />
            <code className="mono-metric">{selectedNode.file_path}:{selectedNode.line_start}</code>
          </div>
          {selectedNode.summary && (
            <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-primary)', lineHeight: 1.55 }}>
              {selectedNode.summary}
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              isSpeaking
                ? stopSpeaking()
                : speakText(`${selectedNode.title}. ${selectedNode.summary || selectedNode.file_path}`)
            }
          >
            {isSpeaking ? <Stop size={14} weight="fill" aria-hidden="true" /> : <SpeakerHigh size={14} aria-hidden="true" />}
            <span>{isSpeaking ? t('askStopSpeaking') : t('flowPlayStep')}</span>
          </button>
        </aside>
      )}

      {/* Bottom 5-Step Voice Tour Dock */}
      <nav
        aria-label={t('flowTourTitle')}
        className="glass-strong"
        data-testid="flow-step-dock"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: '16px',
          transform: 'translateX(-50%)',
          zIndex: 65,
          padding: '8px 14px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          maxWidth: 'calc(100vw - 24px)',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          className="btn btn-tertiary btn-icon"
          style={{ minWidth: '36px', minHeight: '36px' }}
          aria-label={t('flowPrevStep')}
          disabled={activeTourIndex === 0}
          onClick={() => {
            const nextIdx = Math.max(0, activeTourIndex - 1);
            setActiveTourIndex(nextIdx);
            setSelectedNode(DEFAULT_TOUR_STEPS[nextIdx]);
          }}
        >
          <CaretLeft size={16} aria-hidden="true" />
        </button>

        {DEFAULT_TOUR_STEPS.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            className={`btn btn-sm ${idx === activeTourIndex ? 'btn-primary' : 'btn-tertiary'}`}
            style={{ minHeight: '34px', padding: '0 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}
            onClick={() => {
              setActiveTourIndex(idx);
              setSelectedNode(s);
            }}
          >
            <span>{idx + 1}. {s.title}</span>
          </button>
        ))}

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ minHeight: '34px', borderRadius: '999px', whiteSpace: 'nowrap' }}
          onClick={() =>
            isSpeaking
              ? stopSpeaking()
              : speakText(`${activeStep.title}. ${activeStep.summary}`)
          }
        >
          {isSpeaking ? <Stop size={14} weight="fill" aria-hidden="true" /> : <SpeakerHigh size={14} aria-hidden="true" />}
          <span>{isSpeaking ? t('askStopSpeaking') : t('flowPlayStep')}</span>
        </button>

        <button
          type="button"
          className="btn btn-tertiary btn-icon"
          style={{ minWidth: '36px', minHeight: '36px' }}
          aria-label={t('flowNextStep')}
          disabled={activeTourIndex === DEFAULT_TOUR_STEPS.length - 1}
          onClick={() => {
            const nextIdx = Math.min(DEFAULT_TOUR_STEPS.length - 1, activeTourIndex + 1);
            setActiveTourIndex(nextIdx);
            setSelectedNode(DEFAULT_TOUR_STEPS[nextIdx]);
          }}
        >
          <CaretRight size={16} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
