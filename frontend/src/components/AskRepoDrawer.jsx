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
import { useI18n } from '../i18n';
import StatusBadge from './StatusBadge';
import { CodeBlock, FormattedText } from './CodeText';
import AudioWaveform from './AudioWaveform';

function getStrategyRiskMeta(tone, rank) {
  const normalized = String(tone || '').toUpperCase();
  if (normalized === 'GOOD' || rank === 1) {
    return { label: 'Low risk', fillWidth: '28%', color: 'var(--success)' };
  }
  if (normalized.includes('WARN') || rank === 2) {
    return { label: 'Moderate risk', fillWidth: '58%', color: 'var(--warning)' };
  }
  return { label: 'Elevated risk', fillWidth: '78%', color: 'var(--danger)' };
}

export default function AskRepoDrawer({
  isOpen,
  onClose,
  initialFenceId = 'FENCE-001',
  autoPlayAudio = false,
}) {
  const { lang, voiceModel } = useI18n();
  const [query, setQuery] = useState(
    'How do we fix the double-charge bug in GatewayRouter.java without breaking the PR #212 midnight retry fence?'
  );
  const [voiceState, setVoiceState] = useState('Idle'); // 'Idle' | 'Listening' | 'Thinking' | 'Speaking'
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('/api/audio/fence-001_confirmed.wav');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(10);
  const [selectedVoice, setSelectedVoice] = useState(() => (lang === 'te' ? 'Nalini' : lang === 'hi' ? 'Bhavna' : 'Pranav'));
  const [micNotice, setMicNotice] = useState(null);

  // Automatically sync voice model when language is selected
  useEffect(() => {
    if (lang === 'te') {
      setSelectedVoice('Nalini');
    } else if (lang === 'hi') {
      setSelectedVoice('Bhavna');
    } else {
      setSelectedVoice('Pranav');
    }
  }, [lang]);

  const [response, setResponse] = useState({
    spoken_reply:
      'FENCE-001 (`GatewayRouter.java` • PR #212) holds `retryCount = 5` to tolerate Razorpay v1 midnight packet drops. To fix double-charging without breaking the fence, insert an atomic `X-Idempotency-Key` check before `sendV1Frame`, preserving the 5x retry loop until `application.yml` flips `gateway.version` to `v2`.',
    best_solution: {
      headline: 'Inject Deterministic X-Idempotency-Key Inside the 5x Retry Frame',
      explanation:
        'Generate a deterministic SHA-256 idempotency header from `orderId` + settlement date and pass it into `sendV1Frame()` while keeping `retryCount = 5` untouched.',
      recommended_code_patch: `String idempotencyKey = "settle_" + orderId;
for (int attempt = 1; attempt <= retryCount; attempt++) {
    if (sendV1Frame(orderId, amountPaise, timeoutMs, idempotencyKey)) {
        return new PaymentReceipt(orderId, "SETTLED", attempt);
    }
}`,
    },
    rrf_telemetry: {
      rpc_function: 'match_whyline_code_and_fences',
      latency_ms: 14,
      rrf_k: 60,
      matched_fences: [
        {
          id: 'FENCE-001',
          symbol_name: 'GatewayRouter.dispatchSettlement',
          pr_number: '#212',
          rrf_score: '0.0328',
        },
      ],
    },
    strategies: [
      {
        rank: 1,
        title: 'Idempotency Key Injection inside Retry Frame',
        summary:
          'Pass a deterministic UUID derived from `orderId` into `sendV1Frame`, maintaining the 5x loop while ensuring gateway rejects duplicate debits.',
        why_safe: 'Preserves FENCE-001 retry invariant while guaranteeing at-most-once settlement.',
        status_tone: 'GOOD',
        provenance_badge: 'PR #212 Compatible • Invariant Tested',
      },
      {
        rank: 2,
        title: 'Transient Error Circuit Breaker with Exponential Backoff',
        summary:
          'Keep `retryCount = 5` but replace flat `4500ms` timeout with exponential jitter backoff (2s, 4s, 8s).',
        why_safe: 'Conforms to midnight burst mitigation documented in INC-9921.',
        status_tone: 'WARN_AND_REQUIRE_CONFIRMATION',
        provenance_badge: 'Cautionary Intercept • PR #212 ADR',
      },
      {
        rank: 3,
        title: 'Pre-Flight Redis Lock with Expiry Guard',
        summary:
          'Acquire a 30-second distributed lock before initiating settlement attempts, releasing on confirmed terminal state.',
        why_safe: 'Prevents race conditions between concurrent worker pods during midnight recon.',
        status_tone: 'INFO',
        provenance_badge: 'Architecture Council Strategy',
      },
    ],
  });

  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const prevVoiceStateRef = useRef(voiceState);

  // Focus trap + restoration for Ask Drawer
  useEffect(() => {
    if (!isOpen) return undefined;

    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
      // Trap Tab inside drawer
      if (e.key === 'Tab') {
        const focusable = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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

  // Announce voice state changes to screen readers
  useEffect(() => {
    if (prevVoiceStateRef.current === voiceState) return;
    prevVoiceStateRef.current = voiceState;

    const announcer = document.getElementById('voice-state-announcer');
    if (!announcer) return;

    const messages = {
      Idle: 'Voice idle',
      Listening: 'Listening. Speak your question.',
      Thinking: 'Thinking. Processing your question.',
      Speaking: 'Speaking. Playing audio response.',
    };
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = messages[voiceState] || voiceState;
    }, 100);
  }, [voiceState]);

  const handlePlayAudio = (url, textToSpeak = null) => {
    const targetUrl = url || audioUrl || '/api/audio/fence-001_confirmed.wav';
    setAudioUrl(targetUrl);
    setVoiceState('Speaking');
    if (!audioRef.current) {
      audioRef.current = new Audio(targetUrl);
    } else {
      audioRef.current.src = targetUrl;
    }

    const speechText = textToSpeak || response?.spoken_reply;

    const playFallbackSpeech = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && speechText) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(speechText);
          utter.lang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
          setIsPlaying(true);
          setVoiceState('Speaking');
          utter.onend = () => {
            setIsPlaying(false);
            setVoiceState('Idle');
          };
          utter.onerror = () => {
            setIsPlaying(false);
            setVoiceState('Idle');
          };
          window.speechSynthesis.speak(utter);
        } catch {
          setIsPlaying(false);
          setVoiceState('Idle');
        }
      } else {
        setIsPlaying(false);
        setVoiceState('Idle');
      }
    };

    if (url) {
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
      };
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current && audioRef.current.duration) setAudioDuration(audioRef.current.duration);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setVoiceState('Idle');
        setAudioCurrentTime(0);
      };
      audioRef.current.onerror = () => {
        playFallbackSpeech();
      };

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setVoiceState('Speaking');
        })
        .catch(() => {
          playFallbackSpeech();
        });
    } else if (speechText) {
      playFallbackSpeech();
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
          language: languageCode || (lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN'),
          voice: selectedVoice,
          audio_base64: audioBase64 || null,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const replyText = data.spoken_reply || data.spoken_answer || response.spoken_reply;
        setResponse((prev) => ({
          spoken_reply: replyText,
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
      {/* ARIA live region for voice state announcements */}
      <div id="voice-state-announcer" className="live-region-polite" aria-live="polite" />
      <aside ref={drawerRef} className="ask-drawer-panel glass-navbar">
        <div className="ask-drawer-header">
          <div className="drawer-header-flex">
            <ChatCircleText size={20} weight="regular" aria-hidden="true" />
            <div>
              <h2 className="card-title">Ask Repo Co-Pilot</h2>
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
            <span>Close</span>
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
              Ask a Question (Voice or Text)
            </label>
            <div className="chip-grid">
              <input
                id="copilot-input-drawer"
                type="text"
                className={`form-input copilot-input`}
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
              <p className="form-helper text-warning-color">
                {micNotice}
              </p>
            )}

            {voiceState === 'Listening' && (
              <AudioWaveform
                isRecording={true}
                recordingSeconds={recordingSeconds}
                duration={10}
                title="Capturing Spoken Query"
                subtitle="Gnani Prisma v3.0 Acoustic Beamforming"
                onTogglePlay={stopRecording}
              />
            )}
          </form>

          {/* Top 3 Voice Selector synced with Language */}
          <div className="chip-grid">
            <span className="small-caps small-11 text-ink-muted">
              Voice Model (Gnani Timbre):
            </span>
            {[
              { id: 'Nalini', langKey: 'te', label: 'Nalini (Telugu • Crisp)' },
              { id: 'Bhavna', langKey: 'hi', label: 'Bhavna (Hindi • Articulate)' },
              { id: 'Pranav', langKey: 'en', label: 'Pranav (English • Authoritative)' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                className={`filter-chip voice-chip ${selectedVoice === v.id ? 'active' : ''}`}
                style={{
                  border: selectedVoice === v.id ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                  backgroundColor: selectedVoice === v.id ? 'var(--accent-wash)' : 'transparent',
                  fontWeight: selectedVoice === v.id ? '600' : '400',
                }}
                onClick={() => setSelectedVoice(v.id)}
                title={`Select ${v.label} for speech synthesis`}
              >
                {v.label}
              </button>
            ))}
          </div>

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
          <div className="answer-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <AudioWaveform
              isPlaying={isPlaying}
              currentTime={audioCurrentTime}
              duration={audioDuration}
              onTogglePlay={handleToggleAudio}
              onSeek={(seekTime) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = seekTime;
                  setAudioCurrentTime(seekTime);
                }
              }}
              title="Gnani Spoken Architecture Answer"
              subtitle={`Voice: ${selectedVoice} • 16kHz Studio Audio Note`}
            />

            <div className="answer-header-flex">
              <span className="small-caps">Verified Architectural Rationale</span>
            </div>
            <p className="body-prose text-ink">
              <FormattedText text={response.spoken_reply} />
            </p>
          </div>

          {response.best_solution?.recommended_code_patch && (
            <CodeBlock
              label={response.best_solution.headline || 'Recommended Code Patch'}
              code={response.best_solution.recommended_code_patch}
            />
          )}

          {/* 3 Ranked Strategy Items */}
          <div className="strategy-actions-flex">
            <span className="small-caps">3 Ranked Architectural Strategies</span>
            {(response.strategies || []).map((strat) => {
              const risk = getStrategyRiskMeta(strat.status_tone, strat.rank);
              return (
                <div
                  key={strat.rank}
                  className="strategy-card"
                >
                  <div className="strategy-header-flex">
                    <span className="mono-metric mono-weight-500">
                      Strategy 0{strat.rank}
                    </span>
                    <StatusBadge status={strat.status_tone} />
                  </div>
                  <div className="mono-weight-500 text-ink">
                    <FormattedText text={strat.title} />
                  </div>
                  <p className="form-helper text-ink">
                    <FormattedText text={strat.summary} />
                  </p>
                  <div className="risk-meter-wrap">
                    <span className="mono-metric small-12">
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
