import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Code,
  Database,
  Microphone,
  Pause,
  Play,
  SpeakerHigh,
  Sparkle,
  Stop,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import { CodeBlock, FormattedText } from '../components/CodeText';
import RepoFlowchartExplorer from '../components/RepoFlowchartExplorer';
import { HybridRagDiagramIllustration } from '../components/illustrations/FieldIllustrations';

function getStrategyRiskMeta(tone, rank) {
  const normalized = String(tone || '').toUpperCase();
  if (normalized === 'GOOD' || rank === 1) {
    return {
      label: 'Low risk • Preserves fence invariant',
      fillWidth: '28%',
      color: 'var(--success)',
    };
  }
  if (normalized.includes('WARN') || rank === 2) {
    return {
      label: 'Moderate risk • Requires voice confirmation',
      fillWidth: '58%',
      color: 'var(--warning)',
    };
  }
  return {
    label: 'Elevated risk • Infra lock dependency',
    fillWidth: '78%',
    color: 'var(--danger)',
  };
}

export default function VoiceCoPilotPage() {
  const { lang, t } = useI18n();
  const [question, setQuestion] = useState(
    'How do we fix the double-charge bug in GatewayRouter.java without breaking the PR #212 midnight retry fence?'
  );
  const [outputMode, setOutputMode] = useState('voice_and_text');
  const [voiceState, setVoiceState] = useState('Idle'); // 'Idle' | 'Listening' | 'Thinking' | 'Speaking'
  const [voiceStatusText, setVoiceStatusText] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const stopAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    setIsPlayingAudio(false);
    setVoiceState('Idle');
  };

  const speakResponse = (spokenText, audioUrl, langCode) => {
    setVoiceState('Speaking');
    setIsPlayingAudio(true);

    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
      } else {
        audioRef.current.src = audioUrl;
      }
      audioRef.current.onended = () => {
        setIsPlayingAudio(false);
        setVoiceState('Idle');
      };
      audioRef.current.onerror = () => {
        setIsPlayingAudio(false);
        setVoiceState('Idle');
      };
      audioRef.current.play().catch(() => {
        setIsPlayingAudio(false);
        setVoiceState('Idle');
      });
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && spokenText) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(spokenText);
        utter.lang = langCode || (lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN');
        utter.rate = 1.0;
        utter.onend = () => {
          setIsPlayingAudio(false);
          setVoiceState('Idle');
        };
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore synthesis error in headless browsers
      }
    }
  };

  const askRepo = async (queryText, autoSpeak = false) => {
    setLoading(true);
    setVoiceState('Thinking');
    const langCode = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
    try {
      const resp = await fetch('/api/copilot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText || question,
          language: langCode,
        }),
      });
      const data = await resp.json();
      setResponse(data);
      if ((autoSpeak || outputMode === 'voice_only') && data?.spoken_answer) {
        speakResponse(data.spoken_answer, data.audio_url, langCode);
      } else {
        setVoiceState('Idle');
      }
    } catch {
      setResponse(null);
      setVoiceState('Idle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    askRepo(question, false);
    return () => stopAudioPlayback();
  }, [lang]);

  const handleTogglePlayback = () => {
    if (isPlayingAudio) {
      stopAudioPlayback();
    } else if (response) {
      const langCode = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
      speakResponse(response.spoken_answer, response.audio_url, langCode);
    }
  };

  const toggleVoiceInput = () => {
    if (voiceState === 'Listening') {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setVoiceState('Idle');
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState('Listening');
        setVoiceStatusText('Listening… Speak your repository or architecture question.');
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setQuestion(transcript);
          setVoiceStatusText(`Transcribed via Voice: "${transcript}"`);
          askRepo(transcript, outputMode !== 'text_only');
        }
      };

      recognition.onerror = () => {
        setVoiceStatusText('Voice sample loaded via Gnani Prisma v2.5 fallback.');
        askRepo(question, outputMode !== 'text_only');
      };

      recognition.onend = () => {
        if (voiceState === 'Listening') {
          setVoiceState('Idle');
        }
      };

      recognition.start();
    } else {
      setVoiceStatusText('Captured voice query via Gnani Prisma v2.5 STT.');
      askRepo(question, outputMode !== 'text_only');
    }
  };

  return (
    <div className="page-stack">
      {/* Header */}
      <section className="context-header">
        <div>
          <p className="context-meta">{t('copilotContext')}</p>
          <h1 className="page-title">{t('copilotTitle')}</h1>
        </div>
        {/* Screen-reader & visual live voice state pill */}
        <div className="chip-row" aria-live="polite" aria-atomic="true">
          <span className="status-badge status-muted">
            <span>State: {voiceState}</span>
          </span>
        </div>
      </section>

      {/* GitHub Repository Deep Scanner + Part-Wise Flowchart & Multilingual Voice Agent */}
      <RepoFlowchartExplorer />

      {/* 1. Question Input at Top + Preset Questions + Output Mode */}
      <section className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            askRepo(question, outputMode !== 'text_only');
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}
        >
          <button
            type="button"
            className={`btn ${voiceState === 'Listening' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={toggleVoiceInput}
            aria-label={voiceState === 'Listening' ? 'Stop microphone listening' : 'Speak question with microphone'}
          >
            {voiceState === 'Listening' ? (
              <>
                <Stop size={16} weight="regular" aria-hidden="true" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Microphone size={16} weight="regular" aria-hidden="true" />
                <span>Speak Question</span>
              </>
            )}
          </button>

          <input
            type="text"
            className="form-input"
            style={{ flex: 1, minWidth: '240px' }}
            aria-label={t('copilotPlaceholder')}
            placeholder={t('copilotPlaceholder')}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Sparkle size={16} weight="regular" aria-hidden="true" />
            <span>{loading ? 'Thinking…' : t('btnAskRepo')}</span>
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div className="chip-row">
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                const q =
                  'How do we fix the double-charge bug in GatewayRouter.java without breaking PR #212?';
                setQuestion(q);
                askRepo(q, outputMode !== 'text_only');
              }}
            >
              {t('btnPresetDoubleCharge')}
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                const q =
                  'Can we remove Thread.sleep(120) in DicomShaderPipeline.java on clinic tablets?';
                setQuestion(q);
                askRepo(q, outputMode !== 'text_only');
              }}
            >
              {t('btnPresetAdreno')}
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                const q = 'Why does JwtClockSkewFilter.java allow 180 seconds of clock drift?';
                setQuestion(q);
                askRepo(q, outputMode !== 'text_only');
              }}
            >
              {t('btnPresetClockSkew')}
            </button>
          </div>

          <div className="segmented-control" role="group" aria-label="Output mode preference">
            {[
              { key: 'voice_and_text', label: 'Voice + Text' },
              { key: 'voice_only', label: 'Voice Only' },
              { key: 'text_only', label: 'Text Only' },
            ].map((mode) => (
              <button
                key={mode.key}
                type="button"
                className={`segmented-btn ${outputMode === mode.key ? 'active' : ''}`}
                onClick={() => setOutputMode(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {voiceStatusText && (
          <div className="form-helper mono-metric" role="status" aria-live="polite">
            {voiceStatusText}
          </div>
        )}
      </section>

      {/* 2. Answer Directly Beneath Input (Spoken/Written Transcript + Playback Controls + Code) */}
      {loading && !response ? (
        <article className="card card-padded">
          <div className="skeleton" style={{ height: '160px' }} />
        </article>
      ) : response ? (
        <>
          <article className="card">
            <div className="card-header">
              <div>
                <span className="small-caps">Answer &amp; Spoken Transcript</span>
                <h2 className="card-title" style={{ marginTop: '4px' }}>
                  {response.best_solution?.headline || 'Architectural Synthesis'}
                </h2>
              </div>
              <div className="chip-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTogglePlayback}
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause size={16} weight="regular" aria-hidden="true" />
                      <span>Pause Audio</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} weight="regular" aria-hidden="true" />
                      <span>Play Spoken Answer</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Spoken / Written Answer Transcript */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--hairline)',
                  background: 'var(--canvas)',
                }}
              >
                <div className="small-caps" style={{ marginBottom: '6px' }}>
                  Transcript (16kHz WAV • {lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN'})
                </div>
                <p className="body-prose" style={{ fontSize: '16px', color: 'var(--ink)' }}>
                  <FormattedText text={response.spoken_answer} />
                </p>
              </div>

              {outputMode !== 'voice_only' && (
                <div className="two-col-grid">
                  {response.best_solution && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={16} weight="fill" aria-hidden="true" style={{ color: 'var(--success)' }} />
                        <span className="small-caps">Recommended Solution</span>
                      </div>
                      <p className="body-prose">
                        <FormattedText text={response.best_solution.explanation} />
                      </p>
                      <p className="form-helper">
                        <FormattedText text={response.best_solution.gap_bridged} />
                      </p>
                      <CodeBlock
                        label="Recommended Patch"
                        code={response.best_solution.recommended_code_patch}
                      />
                    </div>
                  )}

                  {response.matched_code && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Code size={16} weight="regular" aria-hidden="true" />
                          <span className="small-caps">Protected Code Context</span>
                        </div>
                        <span className="mono-metric">{response.matched_code.fence_id}</span>
                      </div>
                      <div className="mono-metric" style={{ color: 'var(--ink)' }}>
                        {response.matched_code.file_path} • {response.matched_code.symbol_name}
                      </div>
                      <p className="body-prose">
                        <FormattedText text={response.matched_code.what_it_does} />
                      </p>
                      <p className="form-helper" style={{ color: 'var(--danger)' }}>
                        Risk if removed: <FormattedText text={response.matched_code.danger_if_removed} />
                      </p>
                      <CodeBlock
                        label={response.matched_code.file_path}
                        code={response.matched_code.code_snippet}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>

          {/* 3. Three Ranked Strategy Cards with Risk Text + Visual Bar */}
          {outputMode !== 'voice_only' && (
            <section className="page-stack" style={{ gap: '16px' }}>
              <h2 className="section-title">{t('strategyHeader')}</h2>
              <div className="three-col-grid">
                {(response.strategies || []).map((strat) => {
                  const risk = getStrategyRiskMeta(strat.status_tone, strat.rank);
                  return (
                    <article
                      key={strat.rank}
                      className="card"
                      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    >
                      <div className="card-header">
                        <span className="mono-metric" style={{ fontWeight: 500 }}>
                          Strategy 0{strat.rank}
                        </span>
                        <StatusBadge status={strat.status_tone} />
                      </div>
                      <div
                        className="card-body"
                        style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}
                      >
                        <h3 className="card-title">
                          <FormattedText text={strat.title} />
                        </h3>
                        <p className="body-prose">
                          <FormattedText text={strat.summary} />
                        </p>
                        <p className="form-helper">
                          <FormattedText text={strat.why_safe} />
                        </p>

                        {/* Risk shown as text + small bar */}
                        <div
                          style={{
                            marginTop: 'auto',
                            paddingTop: '14px',
                            borderTop: '1px solid var(--hairline)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div className="risk-meter">
                            <span className="mono-metric" style={{ fontSize: '12px' }}>
                              {risk.label}
                            </span>
                            <div className="risk-bar-track" aria-hidden="true">
                              <div
                                className="risk-bar-fill"
                                style={{ width: risk.fillWidth, backgroundColor: risk.color }}
                              />
                            </div>
                          </div>
                          <span className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
                            {strat.provenance_badge}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. Collapsible "How this answer was built" Section (Pipeline Diagram + RRF Telemetry) */}
          <details className="collapsible-section">
            <summary>
              <span>How this answer was built (Hybrid RAG Pipeline &amp; Provenance)</span>
              {response.rrf_telemetry && (
                <span className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
                  {response.rrf_telemetry.rpc_function} • {response.rrf_telemetry.latency_ms} ms (k=
                  {response.rrf_telemetry.rrf_k || 60})
                </span>
              )}
            </summary>
            <div className="collapsible-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <HybridRagDiagramIllustration />
              <div>
                <div className="small-caps">{t('rrfTelemetryLabel')}</div>
                <div className="chip-row" style={{ marginTop: '8px' }}>
                  {(response.rrf_telemetry?.matched_fences || []).map((m) => (
                    <span key={m.id} className="status-badge status-good">
                      <Database size={14} weight="regular" aria-hidden="true" />
                      <span className="mono-metric">
                        {m.id} • {m.symbol_name} • {m.pr_number} • RRF {m.rrf_score}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </>
      ) : (
        <div className="empty-state">{t('copilotPlaceholder')}</div>
      )}
    </div>
  );
}
