import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClockCounterClockwise,
  FileCode,
  GitBranch,
  Graph,
  SpeakerHigh,
  Sparkle,
  Stop,
  X,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import { useWorkbenchSelection } from '../context/WorkbenchContext';
import { useVoiceAgent } from '../context/VoiceAgentContext';
import AskTabPanel from '../components/workbench/AskTabPanel';

export default function AskRepoPage() {
  const { t } = useI18n();
  const {
    repoContext,
    qaHistory = [],
    latestResponse,
    setCurrentQuery,
    selectLocation,
  } = useWorkbenchSelection();
  const { selectedAgent, speakText, stopSpeaking, isSpeaking } = useVoiceAgent();
  const [historyOpen, setHistoryOpen] = useState(false);

  const exampleQuestions = [t('askExample1'), t('askExample2'), t('askExample3')];

  const handlePickExample = (q) => {
    setCurrentQuery(q);
    const input = document.getElementById('workbench-ask-input') || document.querySelector('.ask-input, textarea');
    if (input) input.focus();
  };

  return (
    <div className="ask-repo-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 0 40px' }}>
      {/* Repo Context Bar */}
      <header
        className="glass reveal-stagger"
        style={{
          '--stagger': 0,
          padding: '12px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <GitBranch size={18} weight="bold" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <code className="mono-metric" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {repoContext?.fullName || 'HealthConnect/payment-gateway-v1'}
          </code>
          {repoContext?.files?.length > 0 && (
            <span className="badge" style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '999px', background: 'var(--bg-raised)' }}>
              {repoContext.files.length} files
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            data-testid="ask-history-btn"
            onClick={() => setHistoryOpen(true)}
          >
            <ClockCounterClockwise size={15} aria-hidden="true" />
            <span>{t('askHistory')} ({qaHistory.length})</span>
          </button>
          <Link to="/connect" className="btn btn-tertiary btn-sm">
            {t('navConnect')}
          </Link>
          <Link to="/flow" className="btn btn-tertiary btn-sm">
            <Graph size={15} aria-hidden="true" />
            <span>{t('navFlowChat')}</span>
          </Link>
        </div>
      </header>

      {/* Centered Answer Column (max 72ch) */}
      <div style={{ width: '100%', maxWidth: '72ch', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!latestResponse && qaHistory.length === 0 && (
          <section className="glass reveal-stagger" style={{ '--stagger': 1, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--accent)' }}>
              <Sparkle size={18} aria-hidden="true" />
              <h1 className="card-title" style={{ margin: 0, fontSize: 'var(--type-lg)' }}>
                {t('askEmptyTitle')}
              </h1>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: 'var(--type-sm)', color: 'var(--text-secondary)' }}>
              {t('askEmptySubtitle')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {exampleQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePickExample(q)}
                  style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Re-homed AskTabPanel (keeps all existing STT/RRF/Gnani TTS handlers) */}
        <AskTabPanel />

        {/* Answer Cards History Feed (max 72ch) */}
        {qaHistory.length > 0 && (
          <section aria-label="Answer cards" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {qaHistory.slice(0, 6).map((item, idx) => (
              <article
                key={item.id || idx}
                className="glass reveal-stagger"
                style={{ '--stagger': idx + 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: 'var(--type-md)', color: 'var(--text-primary)' }}>
                    {item.question}
                  </h2>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => (isSpeaking ? stopSpeaking() : speakText(item.answer))}
                    aria-label={`${t('askSpeakAnswer')} (${selectedAgent.displayName})`}
                  >
                    {isSpeaking ? <Stop size={14} weight="fill" aria-hidden="true" /> : <SpeakerHigh size={14} aria-hidden="true" />}
                    <span>{isSpeaking ? t('askStopSpeaking') : t('askSpeakAnswer')}</span>
                  </button>
                </div>

                <div style={{ fontSize: 'var(--type-base)', color: 'var(--text-primary)', lineHeight: 1.65 }}>
                  {String(item.answer || '')
                    .split('\n')
                    .filter(Boolean)
                    .map((line, lIdx) => (
                      <p
                        key={lIdx}
                        className="reveal-stagger"
                        style={{ '--stagger': lIdx, margin: '0 0 8px 0' }}
                      >
                        {line}
                      </p>
                    ))}
                </div>

                {Array.isArray(item.citations) && item.citations.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {item.citations.map((c, cIdx) => {
                      const file = c.file || c.file_path || c;
                      const line = c.line || c.line_start || 1;
                      return (
                        <button
                          key={cIdx}
                          type="button"
                          className="chip"
                          onClick={() => selectLocation({ file, line })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-default)',
                            background: 'var(--bg-raised)',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <FileCode size={13} aria-hidden="true" />
                          <code className="mono-metric">{file}:{line}</code>
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </div>

      {/* History Drawer */}
      {historyOpen && (
        <div
          className="drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t('askHistory')}
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryOpen(false);
          }}
        >
          <aside
            className="glass-sheet"
            style={{
              position: 'fixed',
              top: '16px',
              right: '16px',
              bottom: '16px',
              width: 'min(420px, calc(100vw - 32px))',
              padding: '20px',
              overflowY: 'auto',
              zIndex: 85,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="card-title" style={{ margin: 0, fontSize: 'var(--type-lg)' }}>
                {t('askHistory')}
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                aria-label={t('closeMenuAria')}
                onClick={() => setHistoryOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {qaHistory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--type-sm)' }}>
                {t('askEmptySubtitle')}
              </p>
            ) : (
              qaHistory.map((item, idx) => (
                <div key={item.id || idx} className="glass" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <strong style={{ fontSize: 'var(--type-sm)' }}>{item.question}</strong>
                  <p style={{ margin: 0, fontSize: 'var(--type-xs)', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.answer}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-tertiary btn-sm"
                      onClick={() => {
                        setCurrentQuery(item.question);
                        setHistoryOpen(false);
                      }}
                    >
                      Ask again
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => speakText(item.answer)}
                    >
                      <SpeakerHigh size={13} aria-hidden="true" />
                      <span>{t('askSpeakAnswer')}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
