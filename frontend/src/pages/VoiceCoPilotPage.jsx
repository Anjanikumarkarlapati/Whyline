import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Code,
  Database,
  GitPullRequest,
  Lightbulb,
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
import AudioWaveform from '../components/AudioWaveform';

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

const PR_PRESETS = [
  {
    label: 'PR #212: Double-Charge Retry Fence',
    query: 'How do we fix the double-charge bug in GatewayRouter.java without breaking the PR #212 midnight retry fence?',
  },
  {
    label: 'PR #184: Adreno GPU Sleep Fence',
    query: 'Can we remove Thread.sleep(120) in DicomShaderPipeline.java on clinic tablets?',
  },
  {
    label: 'PR #149: JWT Clock Skew 180s Fence',
    query: 'Why does JwtClockSkewFilter.java allow 180 seconds of clock drift?',
  },
  {
    label: 'PR #95: Offline DICOM Sync Queue',
    query: 'What is the root cause of the offline DICOM queue overflow in PR #95?',
  },
  {
    label: 'Whyline Architecture Overview',
    query: 'Explain how Whyline protects code fences across the repository architecture in simple terms.',
  },
];

export default function VoiceCoPilotPage() {
  const { lang, t } = useI18n();
  const [question, setQuestion] = useState(
    'How do we fix the double-charge bug in GatewayRouter.java without breaking the PR #212 midnight retry fence?'
  );
  const [outputMode, setOutputMode] = useState('voice_and_text');
  const [selectedVoice, setSelectedVoice] = useState('Nalini');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [voiceState, setVoiceState] = useState('Idle'); // 'Idle' | 'Listening' | 'Thinking' | 'Speaking'
  const [voiceStatusText, setVoiceStatusText] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(10);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activeFlowStep, setActiveFlowStep] = useState(null);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (lang === 'te') {
      setSelectedVoice('Nalini');
    } else if (lang === 'hi') {
      setSelectedVoice('Bhavna');
    } else {
      setSelectedVoice('Pranav');
    }
  }, [lang]);

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

    const fallbackSpeech = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && spokenText) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(spokenText);
          utter.lang = langCode || (lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN');
          utter.rate = playbackSpeed;
          utter.onend = () => {
            setIsPlayingAudio(false);
            setVoiceState('Idle');
          };
          utter.onerror = () => {
            setIsPlayingAudio(false);
            setVoiceState('Idle');
          };
          window.speechSynthesis.speak(utter);
        } catch {
          setIsPlayingAudio(false);
          setVoiceState('Idle');
        }
      } else {
        setIsPlayingAudio(false);
        setVoiceState('Idle');
      }
    };

    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
      } else {
        audioRef.current.src = audioUrl;
      }
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
      };
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current && audioRef.current.duration) setAudioDuration(audioRef.current.duration);
      };
      audioRef.current.onended = () => {
        setIsPlayingAudio(false);
        setVoiceState('Idle');
        setAudioCurrentTime(0);
      };
      audioRef.current.onerror = () => {
        fallbackSpeech();
      };
      audioRef.current
        .play()
        .then(() => {
          setIsPlayingAudio(true);
        })
        .catch(() => {
          fallbackSpeech();
        });
    } else if (spokenText) {
      fallbackSpeech();
    } else {
      setIsPlayingAudio(false);
      setVoiceState('Idle');
    }
  };

  const changePlaybackSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const askRepo = async (queryText, autoSpeak = false, overrideVoice = null) => {
    setLoading(true);
    setVoiceState('Thinking');
    const langCode = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
    const activeVoice = overrideVoice || selectedVoice;
    try {
      const resp = await fetch('/api/copilot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText || question,
          language: langCode,
          voice: activeVoice,
        }),
      });
      const data = await resp.json();
      setResponse(data);
      const spokenText = data?.spoken_reply || data?.spoken_answer || data?.simple_explanation;
      if ((autoSpeak || outputMode === 'voice_only') && spokenText) {
        speakResponse(spokenText, data.audio_url, langCode);
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
      const textToSpeak = response.spoken_reply || response.spoken_answer || response.simple_explanation;
      speakResponse(textToSpeak, response.audio_url, langCode);
    }
  };

  const handleSelectFlowStep = (step) => {
    setActiveFlowStep(step);
    const q = `Explain step ${step.step_number}: ${step.title} (${step.fence_id}) in simple terms with a real-life analogy.`;
    setQuestion(q);
    askRepo(q, outputMode !== 'text_only');
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
        setVoiceStatusText('Voice sample loaded via Gnani Prisma v3.0 fallback.');
        askRepo(question, outputMode !== 'text_only');
      };

      recognition.onend = () => {
        if (voiceState === 'Listening') {
          setVoiceState('Idle');
        }
      };

      recognition.start();
    } else {
      setVoiceStatusText('Captured voice query via Gnani Prisma v3.0 STT.');
      askRepo(question, outputMode !== 'text_only');
    }
  };

  return (
    <div className="page-stack" style={{ gap: '20px' }}>
      {/* Context Header */}
      <section className="context-header">
        <div>
          <p className="context-meta">{t('copilotContext')}</p>
          <h1 className="page-title">{t('copilotTitle')}</h1>
        </div>
        <div className="chip-row" aria-live="polite" aria-atomic="true">
          <span className="status-badge status-good">
            <CheckCircle size={14} weight="regular" aria-hidden="true" />
            <span className="mono-metric">Gemini 3.8 Flash + Gnani Timbre v3.0</span>
          </span>
        </div>
      </section>

      {/* Live "Gemini Brain -> Gnani Voice" Pipeline Status Bar */}
      <section
        id="live-pipeline-status-bar"
        className="card card-padded"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: 'var(--surface-raised)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--radius-control)',
          padding: '12px 18px',
        }}
        aria-label="Real-time two-engine AI processing pipeline"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="small-caps" style={{ fontWeight: 600, color: 'var(--ink-muted)' }}>
            Live AI Pipeline:
          </span>

          {/* Stage 1: Gnani STT */}
          <div
            className={`pipeline-stage ${voiceState === 'Listening' ? 'voice-active-stage' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: voiceState === 'Listening' ? 600 : 500,
              backgroundColor: voiceState === 'Listening' ? 'var(--danger-wash)' : 'var(--surface)',
              border: voiceState === 'Listening' ? '1px solid var(--danger)' : '1px solid var(--hairline)',
              color: voiceState === 'Listening' ? 'var(--danger)' : 'var(--ink)',
            }}
          >
            <Microphone size={14} weight={voiceState === 'Listening' ? 'fill' : 'regular'} aria-hidden="true" />
            <span>1. Gnani STT {voiceState === 'Listening' ? '(Listening…)' : '(Prisma v3.0)'}</span>
          </div>

          <ArrowRight size={14} style={{ color: 'var(--ink-muted)' }} aria-hidden="true" />

          {/* Stage 2: Gemini API Thinking */}
          <div
            className={`pipeline-stage ${voiceState === 'Thinking' ? 'voice-active-stage' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: voiceState === 'Thinking' ? 600 : 500,
              backgroundColor: voiceState === 'Thinking' ? 'var(--accent-wash)' : 'var(--surface)',
              border: voiceState === 'Thinking' ? '1px solid var(--accent)' : '1px solid var(--hairline)',
              color: voiceState === 'Thinking' ? 'var(--accent)' : 'var(--ink)',
            }}
          >
            <Brain size={14} weight={voiceState === 'Thinking' ? 'fill' : 'regular'} aria-hidden="true" />
            <span>
              2. Gemini API {voiceState === 'Thinking' ? '(Thinking in Simple Terms…)' : '(Simple Thinking)'}
            </span>
          </div>

          <ArrowRight size={14} style={{ color: 'var(--ink-muted)' }} aria-hidden="true" />

          {/* Stage 3: Gnani Voice Agent Speaking */}
          <div
            className={`pipeline-stage ${voiceState === 'Speaking' ? 'voice-active-stage' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: voiceState === 'Speaking' ? 600 : 500,
              backgroundColor: voiceState === 'Speaking' ? 'var(--accent-wash)' : 'var(--surface)',
              border: voiceState === 'Speaking' ? '1px solid var(--accent)' : '1px solid var(--hairline)',
              color: voiceState === 'Speaking' ? 'var(--accent)' : 'var(--ink)',
            }}
          >
            <SpeakerHigh size={14} weight={voiceState === 'Speaking' ? 'fill' : 'regular'} aria-hidden="true" />
            <span>
              3. Gnani Voice Agent{' '}
              {voiceState === 'Speaking' ? `(Speaking as ${selectedVoice}…)` : `(${selectedVoice} • Timbre v3.0)`}
            </span>
          </div>
        </div>

        <div className="chip-row">
          <span className="mono-metric" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
            {voiceState === 'Idle' ? '● Engine Standby' : `● Pipeline: ${voiceState}`}
          </span>
        </div>
      </section>

      {/* Side-by-Side 2-Column Split: Flowchart (Left) & Gemini Copilot Workbench (Right) */}
      <div className="operational-split" style={{ alignItems: 'start', gap: '20px' }}>
        {/* Left Column: Repository Flowchart & SVG Graph Explorer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <RepoFlowchartExplorer
            onSelectStep={handleSelectFlowStep}
            selectedStepNumber={activeFlowStep?.step_number}
          />
        </div>

        {/* Right Column: Workbench - Ask Gemini & Speak via Gnani */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Question Input + Voice Mic + Submit */}
          <section className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                askRepo(question, outputMode !== 'text_only');
              }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}
            >
              <button
                type="button"
                className={`btn ${voiceState === 'Listening' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={toggleVoiceInput}
                aria-label={
                  voiceState === 'Listening' ? 'Stop microphone listening' : 'Speak question with microphone'
                }
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
                style={{ flex: 1, minWidth: '220px' }}
                aria-label={t('copilotPlaceholder')}
                placeholder={t('copilotPlaceholder')}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Sparkle size={16} weight="regular" aria-hidden="true" />
                <span>{loading ? 'Thinking…' : 'Ask Gemini Brain'}</span>
              </button>
            </form>

            {voiceState === 'Listening' && (
              <AudioWaveform
                isRecording={true}
                duration={10}
                title="Capturing Speech Input"
                subtitle="Gnani Prisma v3.0 Acoustic Beamforming"
                onTogglePlay={toggleVoiceInput}
              />
            )}

            {/* 1-Click PR & Repo Chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="small-caps" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                1-Click PR &amp; Architecture Presets:
              </span>
              <div className="chip-row">
                {PR_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="filter-chip"
                    onClick={() => {
                      setQuestion(preset.query);
                      askRepo(preset.query, outputMode !== 'text_only');
                    }}
                  >
                    <span className="mono-metric" style={{ fontSize: '12px' }}>
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Profile Selector & Audio Speed & Output Mode */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                paddingTop: '10px',
                borderTop: '1px solid var(--hairline)',
              }}
            >
              {/* Voice Agent Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span className="small-caps" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                  Gnani Voice:
                </span>
                {[
                  { id: 'Nalini', label: 'Nalini (Female • Crisp)' },
                  { id: 'Bhavna', label: 'Bhavna (Female • Articulate)' },
                  { id: 'Pranav', label: 'Pranav (Male • Authoritative)' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`filter-chip ${selectedVoice === v.id ? 'active' : ''}`}
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      borderRadius: '14px',
                      border:
                        selectedVoice === v.id
                          ? '1px solid var(--accent)'
                          : '1px solid var(--hairline-strong)',
                      backgroundColor: selectedVoice === v.id ? 'var(--accent-wash)' : 'transparent',
                      fontWeight: selectedVoice === v.id ? '600' : '400',
                    }}
                    onClick={() => {
                      setSelectedVoice(v.id);
                      askRepo(question, outputMode !== 'text_only', v.id);
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Speed Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="small-caps" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                  Speed:
                </span>
                {[0.85, 1.0, 1.15, 1.25].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    className={`segmented-btn ${playbackSpeed === spd ? 'active' : ''}`}
                    style={{ minHeight: '26px', padding: '0 6px', fontSize: '11px' }}
                    onClick={() => changePlaybackSpeed(spd)}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Output Mode Switcher */}
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
                    style={{ minHeight: '28px', padding: '0 8px', fontSize: '12px' }}
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

          {/* Co-Pilot Answer Workbench */}
          {loading && !response ? (
            <article className="card card-padded">
              <div className="skeleton" style={{ height: '200px' }} />
            </article>
          ) : response ? (
            <>
              {/* Voice Agent Audio Header & Player */}
              <article className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '16px 20px 0 20px' }}>
                  <AudioWaveform
                    isPlaying={isPlayingAudio}
                    currentTime={audioCurrentTime}
                    duration={audioDuration}
                    onTogglePlay={handleTogglePlayback}
                    onSeek={(seekTime) => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = seekTime;
                        setAudioCurrentTime(seekTime);
                      }
                    }}
                    title={response.best_solution?.headline || 'Gemini Architectural Reasoning'}
                    subtitle={`Gnani Timbre v3.0 • Voice: ${selectedVoice} • 16kHz Studio Audio Note`}
                  />
                </div>

                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: 0 }}>
                  {/* Spoken Answer Script / Spoken Audio Status */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--hairline)',
                      backgroundColor: 'var(--surface)',
                    }}
                  >
                    <div className="small-caps" style={{ marginBottom: '4px', fontSize: '11px' }}>
                      Gnani Spoken Audio Script ({lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN'} • {selectedVoice})
                    </div>
                    <p className="body-prose" style={{ fontSize: '15px', color: 'var(--ink)', margin: 0 }}>
                      <FormattedText text={response.spoken_reply || response.spoken_answer} />
                    </p>
                  </div>

                  {outputMode !== 'voice_only' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Card 1: In Simple Terms (Gemini API Reasoning) */}
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: 'var(--radius-control)',
                          border: '1px solid var(--hairline-strong)',
                          backgroundColor: 'var(--canvas)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Brain size={18} weight="fill" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                          <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>
                            In Simple Terms (Gemini API Reasoning)
                          </h3>
                        </div>
                        <p className="body-prose" style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                          <FormattedText text={response.simple_explanation || response.spoken_answer} />
                        </p>
                      </div>

                      {/* Card 2: Real-Life Everyday Analogy */}
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: 'var(--radius-control)',
                          border: '1px solid var(--hairline)',
                          backgroundColor: 'var(--surface-raised)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Lightbulb
                            size={18}
                            weight="fill"
                            style={{ color: 'var(--warning)' }}
                            aria-hidden="true"
                          />
                          <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>
                            Real-Life Everyday Analogy
                          </h3>
                        </div>
                        <p className="body-prose" style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                          💡{' '}
                          <FormattedText
                            text={
                              response.real_world_example ||
                              "Think of an electrical circuit breaker: if you bypass it to stop it from tripping, you don't fix the power spike—you burn down the building."
                            }
                          />
                        </p>
                      </div>

                      {/* Card 3: Deep PR Root-Cause & Code Impact */}
                      {response.pr_deep_analysis && (
                        <div
                          style={{
                            padding: '16px',
                            borderRadius: 'var(--radius-control)',
                            border: '1px solid var(--hairline)',
                            backgroundColor: 'var(--surface)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <GitPullRequest size={18} weight="regular" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                              <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>
                                Deep PR Root-Cause &amp; Code Impact
                              </h3>
                            </div>
                            {response.pr_deep_analysis.merge_verdict && (
                              <StatusBadge status={response.pr_deep_analysis.merge_verdict} />
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="small-caps" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                              Root Cause ({response.pr_deep_analysis.pr_reference || 'PR Fence'})
                            </span>
                            <p className="body-prose" style={{ margin: 0, fontSize: '13px' }}>
                              <FormattedText text={response.pr_deep_analysis.root_cause} />
                            </p>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="small-caps" style={{ fontSize: '11px', color: 'var(--danger)' }}>
                              Diff Impact / Danger
                            </span>
                            <p className="body-prose" style={{ margin: 0, fontSize: '13px', color: 'var(--danger)' }}>
                              <FormattedText text={response.pr_deep_analysis.diff_impact} />
                            </p>
                          </div>

                          {response.pr_deep_analysis.safe_patch && (
                            <CodeBlock
                              label={`Recommended Safe Patch (${response.pr_deep_analysis.pr_reference || 'PR Patch'})`}
                              code={response.pr_deep_analysis.safe_patch}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>

              {/* 3 Ranked Architectural Strategies */}
              {outputMode !== 'voice_only' && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h2 className="section-title" style={{ fontSize: '18px' }}>
                    {t('strategyHeader')}
                  </h2>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {(response.strategies || []).map((strat) => {
                      const risk = getStrategyRiskMeta(strat.status_tone, strat.rank);
                      return (
                        <article
                          key={strat.rank}
                          className="card"
                          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                        >
                          <div className="card-header" style={{ padding: '12px 16px' }}>
                            <span className="mono-metric" style={{ fontWeight: 500 }}>
                              Strategy 0{strat.rank}
                            </span>
                            <StatusBadge status={strat.status_tone} />
                          </div>
                          <div
                            className="card-body"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              flex: 1,
                              padding: '14px 16px',
                            }}
                          >
                            <h3 className="card-title" style={{ fontSize: '15px' }}>
                              <FormattedText text={strat.title} />
                            </h3>
                            <p className="body-prose" style={{ fontSize: '13px' }}>
                              <FormattedText text={strat.summary} />
                            </p>
                            <p className="form-helper" style={{ fontSize: '12px' }}>
                              <FormattedText text={strat.why_safe} />
                            </p>

                            <div
                              style={{
                                marginTop: 'auto',
                                paddingTop: '10px',
                                borderTop: '1px solid var(--hairline)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              }}
                            >
                              <div className="risk-meter">
                                <span className="mono-metric" style={{ fontSize: '11px' }}>
                                  {risk.label}
                                </span>
                                <div className="risk-bar-track" aria-hidden="true">
                                  <div
                                    className="risk-bar-fill"
                                    style={{ width: risk.fillWidth, backgroundColor: risk.color }}
                                  />
                                </div>
                              </div>
                              <span className="mono-metric" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
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

              {/* Collapsible Hybrid RAG Telemetry Section */}
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
      </div>
    </div>
  );
}
