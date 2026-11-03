import React, { useEffect, useRef, useState } from 'react';
import {
  ChatCircleText,
  Database,
  Microphone,
  Pause,
  Play,
  Sparkle,
  Stop,
  X,
} from '@phosphor-icons/react';
import { useI18n, toBcp47 } from '../i18n';
import { apiFetch as fetch, getLocalizedStrategies } from '../api/mockApi';
import { resolveSafeSpeechLang } from '../utils/fenceLogic';
import { buildReasonedCodebaseExplanation } from '../utils/codebaseReasoning';
import StatusBadge from './StatusBadge';
import { CodeBlock, FormattedText } from './CodeText';

function getStrategyRiskMeta(tone, rank, t) {
  const normalized = String(tone || '').toUpperCase();
  if (normalized === 'GOOD' || rank === 1) {
    return { label: t('riskLowLabel'), fillWidth: '28%', color: 'var(--success)' };
  }
  if (normalized.includes('WARN') || rank === 2) {
    return { label: t('riskModLabel'), fillWidth: '58%', color: 'var(--warning)' };
  }
  return { label: t('riskHighLabel'), fillWidth: '78%', color: 'var(--danger)' };
}

function buildDrawerInitialResponse(questionText, fenceId, langCode) {
  const bcp47 = toBcp47(langCode);
  const reasoned = buildReasonedCodebaseExplanation({
    question: questionText,
    fenceId,
    language: bcp47,
  });
  const strategies = getLocalizedStrategies(bcp47);
  return {
    spoken_reply: reasoned.spoken_reply,
    simple_explanation: reasoned.simple_explanation,
    real_world_example: reasoned.real_world_example,
    reasoning_steps: reasoned.reasoning_steps,
    reasoning_engine: 'gemini-3.8-flash (ThinkingLevel.MEDIUM)',
    best_solution: {
      headline: strategies[0].title,
      explanation: reasoned.simple_explanation,
      recommended_code_patch: strategies[0].code_patch,
    },
    rrf_telemetry: {
      rpc_function: 'match_whyline_code_and_fences',
      latency_ms: 14,
      rrf_k: 60,
      matched_fences: [
        {
          id: fenceId || 'FENCE-001',
          symbol_name: 'GatewayRouter.dispatchSettlement',
          pr_number: '#212',
          rrf_score: '0.0328',
        },
      ],
    },
    strategies,
  };
}

export default function AskRepoDrawer({
  isOpen,
  onClose,
  initialFenceId = 'FENCE-001',
  autoPlayAudio = false,
}) {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState(() => t('presetQuestionDoubleCharge'));
  const [voiceState, setVoiceState] = useState('Idle'); // 'Idle' | 'Listening' | 'Thinking' | 'Speaking'
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('/api/audio/fence-001_confirmed.wav');
  const [isPlaying, setIsPlaying] = useState(false);
  const [micNotice, setMicNotice] = useState(null);

  const [response, setResponse] = useState(() =>
    buildDrawerInitialResponse(t('presetQuestionDoubleCharge'), initialFenceId, lang)
  );

  useEffect(() => {
    const nextQ = t('presetQuestionDoubleCharge');
    setQuery(nextQ);
    setResponse(buildDrawerInitialResponse(nextQ, initialFenceId, lang));
  }, [lang, initialFenceId]);

  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      setVoiceState('Idle');
      return undefined;
    }

    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (autoPlayAudio) {
      const timer = setTimeout(() => {
        handlePlayAudio('/api/audio/fence-001_confirmed.wav');
      }, 300);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, autoPlayAudio]);

  const handlePlayAudio = (url, textToSpeak = null) => {
    const targetUrl = url || audioUrl || '/api/audio/fence-001_confirmed.wav';
    setAudioUrl(targetUrl);
    setVoiceState('Speaking');
    if (!audioRef.current) {
      audioRef.current = new Audio(targetUrl);
    } else {
      audioRef.current.src = targetUrl;
    }

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setVoiceState('Idle');
    };
    audioRef.current.onerror = () => {
      setIsPlaying(false);
      setVoiceState('Idle');
    };

    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        setIsPlaying(false);
        setVoiceState('Idle');
      });

    const speechText = textToSpeak || response?.spoken_reply;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && speechText) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(speechText);
        utter.lang = resolveSafeSpeechLang(speechText, toBcp47(lang));
        utter.onend = () => {
          setIsPlaying(false);
          setVoiceState('Idle');
        };
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore
      }
    }
  };

  const handleToggleAudio = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      setVoiceState('Idle');
    } else {
      handlePlayAudio(audioUrl, response?.spoken_reply);
    }
  };

  const askRepo = async (queryText, languageCode, audioBase64 = null) => {
    setLoading(true);
    setVoiceState('Thinking');
    setMicNotice(null);
    try {
      const resp = await fetch('/api/copilot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText || query,
          fence_id: initialFenceId,
          language: languageCode || toBcp47(lang),
          audio_base64: audioBase64 || null,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const replyText = data.spoken_reply || data.spoken_answer || response.spoken_reply;
        setResponse((prev) => ({
          spoken_reply: replyText,
          simple_explanation: data.simple_explanation || prev.simple_explanation,
          real_world_example: data.real_world_example || prev.real_world_example,
          reasoning_steps: data.reasoning_steps || prev.reasoning_steps,
          reasoning_engine: data.reasoning_engine || prev.reasoning_engine,
          matched_code: data.matched_code || prev.matched_code,
          best_solution: data.best_solution || prev.best_solution,
          rrf_telemetry: data.rrf_telemetry || prev.rrf_telemetry,
          strategies: data.strategies || prev.strategies,
        }));
        if (data.audio_url) {
          setAudioUrl(data.audio_url);
          handlePlayAudio(data.audio_url, replyText);
        } else {
          setVoiceState('Idle');
        }
      } else {
        setVoiceState('Idle');
      }
    } catch {
      setVoiceState('Idle');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    setMicNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicNotice('Microphone API unavailable here. Use one-click preset buttons below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          askRepo(query, null, reader.result);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setVoiceState('Listening');
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setMicNotice('Microphone permission denied. Use one-click preset buttons below.');
      setVoiceState('Idle');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setVoiceState('Idle');
  };

  if (!isOpen) return null;

  return (
    <div
      className="ask-drawer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Ask Repo Co-Pilot Drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <aside ref={drawerRef} className="ask-drawer-panel glass-navbar">
        <div className="ask-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ChatCircleText size={20} weight="regular" aria-hidden="true" />
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>
                {t('btnAskRepo')}
              </h2>
              <span className="form-helper" aria-live="polite">
                Context: {initialFenceId || 'Whole Repo'} • State: {voiceState}
              </span>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            aria-label="Close Ask the Repo drawer"
          >
            <X size={18} weight="regular" aria-hidden="true" />
            <span>{t('drawerClose')}</span>
          </button>
        </div>

        <div className="ask-drawer-body">
          {/* Question Input at Top */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askRepo(query, null);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <label className="small-caps" htmlFor="copilot-input-drawer">
              {t('drawerAskLabel')}
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                id="copilot-input-drawer"
                type="text"
                className="form-input"
                style={{ flex: 1, minWidth: '200px' }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask an architectural question about fences..."
              />
              {voiceState === 'Listening' ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={stopRecording}
                  aria-label="Stop Voice Recording"
                >
                  <Stop size={16} weight="fill" aria-hidden="true" />
                  <span>Stop ({recordingSeconds}s)</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={startRecording}
                  aria-label="Record question with microphone"
                >
                  <Microphone size={16} weight="regular" aria-hidden="true" />
                  <span>Voice</span>
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Sparkle size={16} weight="regular" aria-hidden="true" />
                <span>{loading ? 'Thinking…' : 'Ask'}</span>
              </button>
            </div>
            {micNotice && (
              <p className="form-helper" style={{ color: 'var(--warning)' }}>
                {micNotice}
              </p>
            )}
          </form>

          {/* Preset Chips */}
          <div className="chip-row">
            <button
              id="btnSampleTelugu"
              type="button"
              className="filter-chip"
              onClick={() => {
                const q =
                  'Avunu, correct! GatewayRouter lo retryCount = 5 alage unchandi, endukante v1 midnight packet drop avtundi until application yml lo gateway dot version v2 ki marustaru.';
                setQuery(q);
                askRepo(q, 'te-IN');
              }}
            >
              Telugu: PR #212 (10s)
            </button>
            <button
              id="btnSampleHindi"
              type="button"
              className="filter-chip"
              onClick={() => {
                const q =
                  'Haan bilkul sahi, GatewayRouter mein retryCount = 5 aur timeoutMs = 4500 mat hatana jab tak application yml mein gateway dot version v2 na ho jaye.';
                setQuery(q);
                askRepo(q, 'hi-IN');
              }}
            >
              Hindi: PR #212 (10s)
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                const q =
                  'How do we fix the double-charge bug in GatewayRouter.java without breaking PR #212?';
                setQuery(q);
                askRepo(q, 'en-IN');
              }}
            >
              Fix Double-Charge
            </button>
          </div>

          {/* Spoken/Written Answer Directly Beneath Input */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--hairline)',
              background: 'var(--canvas)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span className="small-caps">{t('drawerSpokenWrittenTitle')}</span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '36px', padding: '0 12px' }}
                onClick={handleToggleAudio}
              >
                {isPlaying ? (
                  <>
                    <Pause size={14} weight="regular" aria-hidden="true" />
                    <span>{t('drawerPauseWav')}</span>
                  </>
                ) : (
                  <>
                    <Play size={14} weight="regular" aria-hidden="true" />
                    <span>{t('drawerPlayWav')}</span>
                  </>
                )}
              </button>
            </div>
            <p className="body-prose" style={{ color: 'var(--ink)' }}>
              <FormattedText text={response.spoken_reply} />
            </p>

            {response.simple_explanation && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--hairline)',
                  background: 'var(--surface)',
                }}
              >
                <div className="small-caps" style={{ marginBottom: '4px', color: 'var(--accent)' }}>
                  {t('simpleTermsTitle')}
                </div>
                <p className="body-prose" style={{ fontSize: '13px', color: 'var(--ink)' }}>
                  <FormattedText text={response.simple_explanation} />
                </p>
              </div>
            )}

            {response.real_world_example && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--hairline)',
                  background: 'var(--surface)',
                }}
              >
                <div className="small-caps" style={{ marginBottom: '4px', color: 'var(--success)' }}>
                  {t('realWorldExampleTitle')}
                </div>
                <p className="body-prose" style={{ fontSize: '13px', color: 'var(--ink)' }}>
                  <FormattedText text={response.real_world_example} />
                </p>
              </div>
            )}
          </div>

          {response.best_solution?.recommended_code_patch && (
            <CodeBlock
              label={response.best_solution.headline || 'Recommended Code Patch'}
              code={response.best_solution.recommended_code_patch}
            />
          )}

          {/* 3 Ranked Strategy Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="small-caps">{t('strategyHeader')}</span>
            {(response.strategies || []).map((strat) => {
              const risk = getStrategyRiskMeta(strat.status_tone, strat.rank, t);
              return (
                <div
                  key={strat.rank}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--hairline)',
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mono-metric" style={{ fontWeight: 500 }}>
                      Strategy 0{strat.rank}
                    </span>
                    <StatusBadge status={strat.status_tone} />
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--ink)' }}>
                    <FormattedText text={strat.title} />
                  </div>
                  <p className="form-helper" style={{ color: 'var(--ink)' }}>
                    <FormattedText text={strat.summary} />
                  </p>
                  <div className="risk-meter" style={{ marginTop: '4px' }}>
                    <span className="mono-metric" style={{ fontSize: '12px' }}>
                      {risk.label} • {strat.provenance_badge}
                    </span>
                    <div className="risk-bar-track" aria-hidden="true">
                      <div
                        className="risk-bar-fill"
                        style={{ width: risk.fillWidth, backgroundColor: risk.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
