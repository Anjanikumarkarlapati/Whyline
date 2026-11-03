import React, { useState, useEffect, useRef } from 'react';
import {
  ChatCircleText,
  Microphone,
  Sparkle,
  Stop,
} from '@phosphor-icons/react';
import { useI18n, toBcp47 } from '../i18n';
import { apiFetch as fetch, getLocalizedStrategies } from '../api/mockApi';
import { resolveSafeSpeechLang, rescoreSpokenTranscriptWithAst } from '../utils/fenceLogic';
import { buildReasonedCodebaseExplanation } from '../utils/codebaseReasoning';
import RepoFlowchartExplorer from '../components/RepoFlowchartExplorer';
import StatusBadge from '../components/StatusBadge';
import { FormattedText } from '../components/CodeText';
import { WaveformIllustration } from '../components/illustrations/FieldIllustrations';

function buildInstantCopilotState(activeQ, bcp47) {
  const reasoned = buildReasonedCodebaseExplanation({
    question: activeQ,
    fenceId: 'FENCE-001',
    language: bcp47,
  });
  const strategies = getLocalizedStrategies(bcp47);
  return {
    question: activeQ,
    language: bcp47,
    spoken_reply: reasoned.spoken_reply,
    simple_explanation: reasoned.simple_explanation,
    real_world_example: reasoned.real_world_example,
    reasoning_steps: reasoned.reasoning_steps,
    reasoning_engine: 'gemini-3.8-flash (ThinkingLevel.MEDIUM)',
    strategies,
    rrf_telemetry: {
      rpc_function: 'match_whyline_code_and_fences',
      latency_ms: 14,
      rrf_k: 60,
    },
  };
}

export default function VoiceCoPilotPage({ fences = [] }) {
  const { lang, t } = useI18n();
  const [question, setQuestion] = useState(() => t('presetQuestionDoubleCharge'));
  const [outputMode, setOutputMode] = useState('voice'); // 'voice' | 'text'
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [response, setResponse] = useState(() =>
    buildInstantCopilotState(t('presetQuestionDoubleCharge'), toBcp47(lang))
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const prevLangRef = useRef(lang);

  const speakResponse = (textToSpeak, targetLangCode) => {
    if (outputMode !== 'voice' || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      utter.lang = resolveSafeSpeechLang(textToSpeak, targetLangCode);
      utter.rate = 0.96;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleAsk = async (overrideQuestion, overrideLang) => {
    const activeQ = overrideQuestion !== undefined ? overrideQuestion : question;
    const activeLang = overrideLang || lang;
    const bcp47 = toBcp47(activeLang);

    const instant = buildInstantCopilotState(activeQ, bcp47);
    setResponse(instant);
    if (outputMode === 'voice' && instant.spoken_reply) {
      speakResponse(instant.spoken_reply, bcp47);
    }

    setLoading(true);
    try {
      const res = await fetch('/api/copilot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQ,
          language: bcp47,
          output_mode: outputMode,
        }),
      });
      const data = await res.json();
      setResponse(data);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize when user switches language
  useEffect(() => {
    const nextQ = t('presetQuestionDoubleCharge');
    if (prevLangRef.current !== lang) {
      prevLangRef.current = lang;
      setQuestion(nextQ);
      handleAsk(nextQ, lang);
    }
  }, [lang]);

  useEffect(() => {
    if (!recording) {
      setRecordingSec(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordingSec((prev) => {
        if (prev >= 10) {
          setRecording(false);
          const rescored = rescoreSpokenTranscriptWithAst(t('presetQuestionDoubleCharge'));
          setQuestion(rescored.rescored);
          return 10;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [recording, lang]);

  const handlePresetClick = (presetKey) => {
    const presetText = t(presetKey);
    setQuestion(presetText);
    handleAsk(presetText, lang);
  };

  return (
    <div className="page-stack">
      {/* Editorial Context Header */}
      <section className="context-header">
        <div>
          <p className="context-meta">{t('copilotContext')} • {toBcp47(lang)}</p>
          <h1 className="page-title">{t('copilotTitle')}</h1>
          <p className="body-prose" style={{ color: 'var(--ink-muted)', marginTop: '6px' }}>
            {t('copilotSubtitle')}
          </p>
        </div>
        <WaveformIllustration size={108} active={recording || isSpeaking} />
      </section>

      {/* Main Co-Pilot Interactive Card */}
      <article className="card">
        <div className="card-header">
          <div className="chip-row" style={{ flex: 1 }}>
            <button
              type="button"
              className="filter-chip"
              onClick={() => handlePresetClick('presetQuestionDoubleCharge')}
            >
              {t('presetLabelDoubleCharge')}
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => handlePresetClick('presetQuestionAdreno')}
            >
              {t('presetLabelAdreno')}
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => handlePresetClick('presetQuestionClockSkew')}
            >
              {t('presetLabelClockSkew')}
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => handlePresetClick('presetQuestionWhylineArch')}
            >
              {t('presetLabelWhylineArch')}
            </button>
          </div>

          <div
            role="group"
            aria-label="Output mode selector"
            style={{
              display: 'inline-flex',
              border: '1px solid var(--hairline-strong)',
              borderRadius: '999px',
              padding: '3px',
              background: 'var(--canvas)',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setOutputMode('voice')}
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: outputMode === 'voice' ? 'var(--accent)' : 'transparent',
                color: outputMode === 'voice' ? 'var(--accent-contrast)' : 'var(--ink)',
              }}
            >
              {t('outputModeVoiceAndText')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOutputMode('text');
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
              }}
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: outputMode === 'text' ? 'var(--accent)' : 'transparent',
                color: outputMode === 'text' ? 'var(--accent-contrast)' : 'var(--ink)',
              }}
            >
              {t('outputModeTextOnly')}
            </button>
          </div>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="copilot-query-input">
              {t('copilotInputLabel')} ({toBcp47(lang)})
            </label>
            <textarea
              id="copilot-query-input"
              className="form-textarea"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleAsk(question, lang)}
                disabled={loading}
              >
                <Sparkle size={16} weight="regular" aria-hidden="true" />
                <span>{loading ? t('btnThinking') : t('btnAskCopilot')}</span>
              </button>
              <button
                type="button"
                className={recording ? 'btn btn-danger' : 'btn btn-secondary'}
                onClick={() => {
                  if (recording) {
                    setRecording(false);
                    const rescored = rescoreSpokenTranscriptWithAst(question || t('presetQuestionDoubleCharge'));
                    setQuestion(rescored.rescored);
                  } else {
                    setRecording(true);
                  }
                }}
              >
                {recording ? (
                  <>
                    <Stop size={16} weight="fill" aria-hidden="true" />
                    <span>{t('btnStopMic')} ({recordingSec}s/10s)</span>
                  </>
                ) : (
                  <>
                    <Microphone size={16} weight="regular" aria-hidden="true" />
                    <span>{t('btnHoldMic')}</span>
                  </>
                )}
              </button>
            </div>

            {response?.rrf_telemetry && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="status-badge status-good">
                  <span>{response.reasoning_engine || 'gemini-3.8-flash (ThinkingLevel.HIGH)'}</span>
                </span>
                <span className="status-badge status-info">
                  <span>{t('copilotRrfBadge')}: {response.rrf_telemetry.latency_ms}ms</span>
                </span>
                <span className="status-badge status-good">
                  <span>{t('copilotLanguageBadge')}: {response.language || toBcp47(lang)}</span>
                </span>
              </div>
            )}
          </div>

          {response?.spoken_reply && (
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--hairline)',
                background: 'var(--canvas)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div>
                <div className="small-caps" style={{ marginBottom: '6px' }}>
                  {t('drawerSpokenWrittenTitle')}
                </div>
                <p className="body-prose" style={{ color: 'var(--ink)' }}>
                  <FormattedText text={response.spoken_reply} />
                </p>
              </div>

              {(response.simple_explanation || response.real_world_example) && (
                <div className="two-col-grid" style={{ paddingTop: '12px', borderTop: '1px solid var(--hairline)' }}>
                  {response.simple_explanation && (
                    <div
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-control)',
                        border: '1px solid var(--hairline)',
                        background: 'var(--surface)',
                      }}
                    >
                      <div className="small-caps" style={{ marginBottom: '6px', color: 'var(--accent)' }}>
                        {t('simpleTermsTitle')}
                      </div>
                      <p className="body-prose" style={{ fontSize: '14px', color: 'var(--ink)' }}>
                        <FormattedText text={response.simple_explanation} />
                      </p>
                    </div>
                  )}

                  {response.real_world_example && (
                    <div
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-control)',
                        border: '1px solid var(--hairline)',
                        background: 'var(--surface)',
                      }}
                    >
                      <div className="small-caps" style={{ marginBottom: '6px', color: 'var(--success)' }}>
                        {t('realWorldExampleTitle')}
                      </div>
                      <p className="body-prose" style={{ fontSize: '14px', color: 'var(--ink)' }}>
                        <FormattedText text={response.real_world_example} />
                      </p>
                    </div>
                  )}
                </div>
              )}

              {Array.isArray(response.reasoning_steps) && response.reasoning_steps.length > 0 && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--hairline)',
                    background: 'var(--surface-raised)',
                  }}
                >
                  <div className="small-caps" style={{ marginBottom: '6px' }}>
                    {t('reasoningTraceTitle')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--ink)' }}>
                    {response.reasoning_steps.map((stepStr, idx) => (
                      <div key={idx}>
                        <FormattedText text={stepStr} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      {/* 3 Ranked Strategy Cards */}
      {response?.strategies && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {response.strategies.map((strat) => {
            const isLowRisk = (strat.risk_score ?? 20) <= 25 || strat.rank === 1;
            const isHighRisk = (strat.risk_score ?? 20) >= 70 || strat.rank === 3;
            return (
              <article
                key={strat.rank}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div className="card-header">
                  <span className="mono-metric" style={{ fontWeight: 600 }}>
                    #0{strat.rank} • {t('copilotRiskScore')}: {strat.risk_score ?? (strat.rank === 1 ? 14 : strat.rank === 2 ? 42 : 68)}/100
                  </span>
                  <StatusBadge status={strat.status_tone || (isLowRisk ? 'GOOD' : isHighRisk ? 'INFO' : 'WARNING')} />
                </div>

                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  <h2 className="card-title" style={{ fontSize: '16px' }}>
                    <FormattedText text={strat.title} />
                  </h2>
                  <p className="body-prose" style={{ fontSize: '14px', color: 'var(--ink-muted)' }}>
                    <FormattedText text={strat.summary} />
                  </p>

                  <div
                    style={{
                      marginTop: 'auto',
                      padding: '12px',
                      borderRadius: 'var(--radius-control)',
                      background: 'var(--canvas)',
                      border: '1px solid var(--hairline)',
                      fontSize: '13px',
                    }}
                  >
                    <div className="small-caps" style={{ marginBottom: '4px' }}>
                      {t('copilotWhySafe')}
                    </div>
                    <div style={{ color: 'var(--ink)' }}>
                      <FormattedText text={strat.why_safe} />
                    </div>
                    {strat.uncertainty_note && (
                      <div style={{ fontSize: '12px', color: 'var(--ink-muted)', borderTop: '1px solid var(--hairline)', marginTop: '8px', paddingTop: '6px' }}>
                        <strong>{t('copilotUncertainty')}:</strong> <FormattedText text={strat.uncertainty_note} />
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Repository Call-Graph & Step-by-Step Narration Explorer */}
      <RepoFlowchartExplorer fences={fences} />
    </div>
  );
}
