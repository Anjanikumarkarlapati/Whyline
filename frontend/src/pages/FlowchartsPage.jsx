import React, { useCallback, useState } from 'react';
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

export default function FlowchartsPage() {
  const { t } = useI18n();
  const { repoContext, selectLocation } = useWorkbenchSelection();
  const { selectedAgent, speakText, stopSpeaking, isSpeaking } = useVoiceAgent();

  const [flowData, setFlowData] = useState(null);
  const [activeTourIndex, setActiveTourIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);

  const tourSteps = Array.isArray(flowData?.steps) && flowData.steps.length > 0 ? flowData.steps : [];
  const activeStep = tourSteps[activeTourIndex] || tourSteps[0] || null;

  const handleSelectStep = useCallback(
    (step, meta = {}) => {
      if (!step) return;
      if (meta?.userInitiated) {
        setSelectedNode({
          title: step.title || step.label || 'Architecture Node',
          file_path: step.file_path || 'src/index.ts',
          line_start: step.line_start || step.target_line || 1,
          summary: step.explanation || step.summary || step.description || '',
        });
      }
      if (step.file_path) {
        const parsedLine =
          step.line_start ||
          step.target_line ||
          parseInt(String(step.line_range || '1').split('-')[0], 10) ||
          1;
        selectLocation({ file: step.file_path, line: parsedLine });
      }
    },
    [selectLocation]
  );

  return (
    <div
      className="flowchat-fullbleed"
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 130px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingBottom: tourSteps.length > 0 ? '92px' : '24px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <GitBranch size={17} weight="bold" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <strong style={{ fontSize: 'var(--type-sm)' }}>{t('navFlowChat')}</strong>
          <code className="mono-metric" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {flowData?.repo_name || repoContext?.fullName || 'HealthConnect/payment-gateway-v1'}
          </code>
          {tourSteps.length > 0 && (
            <span className="badge" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'var(--bg-raised)' }}>
              {tourSteps.length} steps
            </span>
          )}
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
          <RepoFlowchartExplorer
            onSelectStep={handleSelectStep}
            onFlowDataChange={setFlowData}
            externalActiveStepIdx={activeTourIndex}
            onActiveStepIdxChange={setActiveTourIndex}
          />
        </ErrorBoundary>
      </div>

      {/* Glass Node Detail Sheet (opens on explicit node/step click) */}
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

      {/* Dynamic Bottom Tour Dock synced to the real scanned repository */}
      {tourSteps.length > 0 && (
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
            disabled={activeTourIndex <= 0}
            onClick={() => {
              const nextIdx = Math.max(0, activeTourIndex - 1);
              setActiveTourIndex(nextIdx);
              handleSelectStep(tourSteps[nextIdx], { userInitiated: true });
            }}
          >
            <CaretLeft size={16} aria-hidden="true" />
          </button>

          {tourSteps.slice(0, 6).map((s, idx) => {
            const label = String(s.title || s.label || `Step ${idx + 1}`)
              .replace(/^\s*(?:step\s*)?\d+\s*[.:)-]\s*/i, '')
              .trim();
            return (
              <button
                key={s.node_id || s.id || idx}
                type="button"
                className={`btn btn-sm ${idx === activeTourIndex ? 'btn-primary' : 'btn-tertiary'}`}
                style={{ minHeight: '34px', padding: '0 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}
                onClick={() => {
                  setActiveTourIndex(idx);
                  handleSelectStep(s, { userInitiated: true });
                }}
              >
                <span>{idx + 1}. {label}</span>
              </button>
            );
          })}

          {activeStep && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ minHeight: '34px', borderRadius: '999px', whiteSpace: 'nowrap' }}
              onClick={() =>
                isSpeaking
                  ? stopSpeaking()
                  : speakText(`${activeStep.title}. ${activeStep.explanation || activeStep.summary || ''}`)
              }
            >
              {isSpeaking ? <Stop size={14} weight="fill" aria-hidden="true" /> : <SpeakerHigh size={14} aria-hidden="true" />}
              <span>{isSpeaking ? t('askStopSpeaking') : t('flowPlayStep')}</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-tertiary btn-icon"
            style={{ minWidth: '36px', minHeight: '36px' }}
            aria-label={t('flowNextStep')}
            disabled={activeTourIndex >= tourSteps.length - 1}
            onClick={() => {
              const nextIdx = Math.min(tourSteps.length - 1, activeTourIndex + 1);
              setActiveTourIndex(nextIdx);
              handleSelectStep(tourSteps[nextIdx], { userInitiated: true });
            }}
          >
            <CaretRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
