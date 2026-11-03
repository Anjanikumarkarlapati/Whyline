import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  Code,
  GitBranch,
  Pause,
  Play,
  SkipForward,
  SpeakerHigh,
  Waveform,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import { apiFetch as fetch } from '../api/mockApi';
import StatusBadge from './StatusBadge';
import { CodeBlock, FormattedText } from './CodeText';

const DEMO_REPOS = [
  {
    labelKey: 'presetRepoWhyline',
    fallback: 'Anjanikumarkarlapati/Whyline',
    url: 'https://github.com/Anjanikumarkarlapati/Whyline',
  },
  {
    labelKey: 'presetRepoHealthConnect',
    fallback: 'healthconnect-india/payment-gateway-service',
    url: 'https://github.com/healthconnect-india/payment-gateway-service',
  },
  {
    labelKey: 'presetRepoDicom',
    fallback: 'whyline-labs/clinical-dicom-pipeline',
    url: 'https://github.com/whyline-labs/clinical-dicom-pipeline',
  },
];

export default function RepoFlowchartExplorer() {
  const { lang, setLang, t } = useI18n();
  const [githubUrl, setGithubUrl] = useState(
    'https://github.com/Anjanikumarkarlapati/Whyline'
  );
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [isWalkthroughPlaying, setIsWalkthroughPlaying] = useState(false);
  const [isStepSpeaking, setIsStepSpeaking] = useState(false);

  const audioRef = useRef(null);
  const walkthroughTimerRef = useRef(null);
  const walkthroughActiveRef = useRef(false);

  const langCode = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';

  const stopVoiceWalkthrough = () => {
    walkthroughActiveRef.current = false;
    setIsWalkthroughPlaying(false);
    setIsStepSpeaking(false);
    if (walkthroughTimerRef.current) {
      clearTimeout(walkthroughTimerRef.current);
      walkthroughTimerRef.current = null;
    }
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
  };

  const fetchFlowchartScan = async (targetUrl, targetLangCode, autoPlayWalkthrough = false) => {
    stopVoiceWalkthrough();
    setLoading(true);
    try {
      const resp = await fetch('/api/repo/scan-flowchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: targetUrl || githubUrl,
          github_url: targetUrl || githubUrl,
          language: targetLangCode || langCode,
        }),
      });
      const json = await resp.json();
      setFlowData(json);
      setActiveStepIdx(0);
      if (autoPlayWalkthrough && json?.steps?.length > 0) {
        startStepWalkthrough(json.steps, 0);
      }
    } catch {
      // Keep previous state on transient failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowchartScan(githubUrl, langCode, false);
    return () => stopVoiceWalkthrough();
  }, [lang]);

  const playSingleStepAudio = (stepObj, onComplete) => {
    if (!stepObj) return;
    setIsStepSpeaking(true);

    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      if (walkthroughTimerRef.current) {
        clearTimeout(walkthroughTimerRef.current);
        walkthroughTimerRef.current = null;
      }
      if (onComplete) {
        onComplete();
      } else {
        setIsStepSpeaking(false);
      }
    };

    // Trigger Web Speech API with exact localized BCP-47 voice alongside 16kHz WAV stream
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && stepObj.spoken_narration) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(stepObj.spoken_narration);
        utter.lang = stepObj.tts_language || langCode;
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore browser TTS error
      }
    }

    // Fallback timer so walkthrough progresses reliably even if headless audio is muted
    walkthroughTimerRef.current = setTimeout(finishOnce, 2200);

    if (stepObj.audio_url) {
      if (!audioRef.current) {
        audioRef.current = new Audio(stepObj.audio_url);
      } else {
        audioRef.current.src = stepObj.audio_url;
      }
      audioRef.current.onended = finishOnce;
      audioRef.current.onerror = finishOnce;
      audioRef.current.onpause = () => {
        if (!walkthroughActiveRef.current) {
          finishOnce();
        }
      };
      audioRef.current.play().catch(() => {
        // Handled by timer
      });
    }
  };

  const startStepWalkthrough = (stepsList, startIndex = 0) => {
    const steps = stepsList || flowData?.steps || [];
    if (!steps.length) return;
    walkthroughActiveRef.current = true;
    setIsWalkthroughPlaying(true);

    const runStep = (idx) => {
      if (!walkthroughActiveRef.current || idx >= steps.length) {
        walkthroughActiveRef.current = false;
        setIsWalkthroughPlaying(false);
        setIsStepSpeaking(false);
        return;
      }
      setActiveStepIdx(idx);
      playSingleStepAudio(steps[idx], () => {
        if (walkthroughActiveRef.current) {
          runStep(idx + 1);
        }
      });
    };

    runStep(startIndex);
  };

  const steps = flowData?.steps || [];
  const currentStep = steps[activeStepIdx] || steps[0] || null;
  const voiceMeta = flowData?.voice_analysis || {
    speaker: 'Nalini (Gnani Vachana timbre-v2.5)',
    language: langCode,
    sample_rate_hz: 16000,
    encoding: '16-bit Mono PCM WAV + WebSpeech TTS',
    fundamental_hz: lang === 'te' ? 215 : lang === 'hi' ? 198 : 185,
    cadence_hz: lang === 'te' ? 5.2 : lang === 'hi' ? 4.6 : 4.1,
  };

  return (
    <article className="card" aria-label={t('explorerTitle')}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p className="context-meta" style={{ marginBottom: '4px' }}>
            {t('explorerContext')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <GitBranch size={18} weight="regular" aria-hidden="true" />
            <h2 className="card-title" style={{ margin: 0 }}>
              {t('explorerTitle')}
            </h2>
          </div>
          <p className="form-helper" style={{ marginTop: '4px' }}>
            {t('explorerSubtitle')}
          </p>
        </div>

        <div className="chip-row" aria-live="polite">
          {flowData && (
            <span className="status-badge status-good">
              <CheckCircle size={14} weight="fill" aria-hidden="true" />
              <span className="mono-metric">
                {flowData.repo_slug} • {flowData.gnani_language?.toUpperCase()} • Nalini
              </span>
            </span>
          )}
          <span className={`status-badge ${isStepSpeaking ? 'status-warn' : 'status-muted'}`}>
            <SpeakerHigh size={14} weight="regular" aria-hidden="true" />
            <span className="mono-metric">
              {isStepSpeaking ? t('voiceStateSpeaking') : t('voiceStateReady')}
            </span>
          </span>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Row 1: GitHub Repo URL Input + Scan & Voice Walkthrough Actions */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchFlowchartScan(githubUrl, langCode, true);
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}
        >
          <input
            id="github-repo-url-input"
            type="text"
            className="form-input"
            style={{ flex: 1, minWidth: '260px', fontFamily: 'var(--font-mono)' }}
            aria-label={t('gitInputAria')}
            placeholder="https://github.com/Anjanikumarkarlapati/Whyline"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
          />

          <button
            id="btn-scan-github-repo"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            <ArrowsClockwise size={16} weight="regular" aria-hidden="true" />
            <span>{loading ? t('explorerBtnScanning') : t('explorerBtnScan')}</span>
          </button>

          {isWalkthroughPlaying ? (
            <button
              id="btn-stop-walkthrough"
              type="button"
              className="btn btn-danger"
              onClick={stopVoiceWalkthrough}
            >
              <Pause size={16} weight="regular" aria-hidden="true" />
              <span>{t('explorerBtnStopVoice')}</span>
            </button>
          ) : (
            <button
              id="btn-play-walkthrough"
              type="button"
              className="btn btn-secondary"
              onClick={() => startStepWalkthrough(steps, 0)}
              disabled={!steps.length}
            >
              <Play size={16} weight="regular" aria-hidden="true" />
              <span>{t('explorerBtnPlayAll')}</span>
            </button>
          )}
        </form>

        {/* Row 2: Demo GitHub Repo Quick Links + Direct Voice Language Switcher (TE / HI / EN) */}
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
            {DEMO_REPOS.map((demo) => (
              <button
                key={demo.url}
                type="button"
                className={`filter-chip ${githubUrl === demo.url ? 'active' : ''}`}
                onClick={() => {
                  setGithubUrl(demo.url);
                  fetchFlowchartScan(demo.url, langCode, false);
                }}
              >
                <span className="mono-metric">{t(demo.labelKey) || demo.fallback}</span>
              </button>
            ))}
          </div>

          <div className="segmented-control" role="group" aria-label={t('gitLangAria')}>
            {[
              { code: 'en', label: 'English (EN)' },
              { code: 'te', label: 'తెలుగు (TE)' },
              { code: 'hi', label: 'हिंदी (HI)' },
            ].map((item) => (
              <button
                key={item.code}
                id={`btn-flow-lang-${item.code}`}
                type="button"
                className={`segmented-btn ${lang === item.code ? 'active' : ''}`}
                onClick={() => setLang(item.code)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2.5: Live Voice & Audio Telemetry Analyzer Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--hairline)',
            background: 'var(--surface-raised)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Waveform size={18} weight="regular" aria-hidden="true" />
            <strong style={{ fontSize: '13px' }}>{t('voiceTelemetryTitle')}</strong>
          </div>
          <div className="chip-row" style={{ fontSize: '12px' }}>
            <span className="mono-metric">
              {t('voiceTelemetryModel')}: {voiceMeta.speaker}
            </span>
            <span className="mono-metric">•</span>
            <span className="mono-metric">
              {t('voiceTelemetryLang')}: {langCode} (F0 {voiceMeta.fundamental_hz}Hz / {voiceMeta.cadence_hz}Hz)
            </span>
            <span className="mono-metric">•</span>
            <span className="mono-metric">
              {t('voiceTelemetryFormat')}: {voiceMeta.sample_rate_hz}Hz 16-bit PCM WAV
            </span>
          </div>
        </div>

        {/* Row 3: Interactive 5-Stage Visual Flowchart (Part-by-Part Node Pipeline) */}
        {steps.length > 0 && (
          <div
            role="region"
            aria-label={t('explorerTitle')}
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--hairline)',
              background: 'var(--surface-raised)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
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
              <span className="mono-metric" style={{ fontWeight: 500 }}>
                {flowData?.repo_slug} • {t('explorerNodesCount')}: {steps.length} •{' '}
                {t('explorerStepCounter')}: {activeStepIdx + 1} / {steps.length}
              </span>
              <div className="chip-row">
                <button
                  id="btn-speak-current-step"
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: '32px', padding: '0 12px' }}
                  onClick={() => playSingleStepAudio(currentStep)}
                >
                  <SpeakerHigh size={14} weight="regular" aria-hidden="true" />
                  <span>
                    {t('explorerBtnSpeakPart')} {activeStepIdx + 1}
                  </span>
                </button>
                <button
                  id="btn-next-flow-step"
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: '32px', padding: '0 12px' }}
                  onClick={() => {
                    const nextIdx = (activeStepIdx + 1) % steps.length;
                    setActiveStepIdx(nextIdx);
                    playSingleStepAudio(steps[nextIdx]);
                  }}
                >
                  <SkipForward size={14} weight="regular" aria-hidden="true" />
                  <span>
                    {t('explorerBtnNextPart')} ({((activeStepIdx + 1) % steps.length) + 1}/{steps.length})
                  </span>
                </button>
              </div>
            </div>

            {/* Connected Flowchart Nodes */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '12px',
                alignItems: 'stretch',
              }}
            >
              {steps.map((step, idx) => {
                const isActive = idx === activeStepIdx;
                const isCompleted = idx < activeStepIdx;
                return (
                  <button
                    key={step.node_id}
                    id={`flow-node-step-${step.step_number}`}
                    type="button"
                    onClick={() => {
                      stopVoiceWalkthrough();
                      setActiveStepIdx(idx);
                      playSingleStepAudio(step);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-control)',
                      border: isActive
                        ? '2px solid var(--accent)'
                        : '1px solid var(--hairline-strong)',
                      background: isActive ? 'var(--canvas)' : 'var(--surface)',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <span className="mono-metric" style={{ fontWeight: 600 }}>
                        {t('gitStepPrefix')} 0{step.step_number}
                      </span>
                      <span className="mono-metric" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                        {isActive ? t('svgSpeaking') : isCompleted ? t('svgExplained') : step.fence_id}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '14px', lineHeight: 1.3 }}>
                      {step.title}
                    </div>

                    <div
                      className="mono-metric"
                      style={{
                        fontSize: '11px',
                        color: 'var(--ink-muted)',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {step.symbol_name}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '4px',
                      }}
                    >
                      <StatusBadge status={step.status} />
                      {idx < steps.length - 1 && (
                        <ArrowRight size={14} weight="regular" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 4: Part-Wise Active Flowchart Step Detail & Synchronized Voice Explanation */}
        {currentStep && (
          <div
            id="active-flowchart-part-panel"
            style={{
              padding: '20px 24px',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--hairline-strong)',
              background: 'var(--canvas)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--hairline)',
              }}
            >
              <div>
                <div className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
                  {currentStep.phase} • {currentStep.fence_id} ({currentStep.pr_number} /{' '}
                  {currentStep.incident_id})
                </div>
                <h3 className="card-title" style={{ marginTop: '4px' }}>
                  {t('gitStepPrefix')} {currentStep.step_number}: {currentStep.title}
                </h3>
              </div>
              <StatusBadge status={currentStep.status} />
            </div>

            {/* Voice Agent Step Narration Box */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--hairline)',
                background: 'var(--surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
                  Gnani Vachana ({currentStep.tts_language || langCode} • timbre-v2.5 • Nalini)
                </span>
                <span className="mono-metric">{currentStep.audio_url}</span>
              </div>
              <p
                id="active-step-spoken-narration"
                className="body-prose"
                style={{ fontSize: '16px', color: 'var(--ink)' }}
              >
                <FormattedText text={currentStep.spoken_narration} />
              </p>

              {(currentStep.simple_explanation || currentStep.real_world_example) && (
                <div
                  className="two-col-grid"
                  style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--hairline)',
                  }}
                >
                  {currentStep.simple_explanation && (
                    <div>
                      <div className="small-caps" style={{ marginBottom: '4px', color: 'var(--accent)' }}>
                        {t('simpleTermsTitle')}
                      </div>
                      <p className="body-prose" style={{ fontSize: '14px', color: 'var(--ink)' }}>
                        <FormattedText text={currentStep.simple_explanation} />
                      </p>
                    </div>
                  )}
                  {currentStep.real_world_example && (
                    <div>
                      <div className="small-caps" style={{ marginBottom: '4px', color: 'var(--success)' }}>
                        {t('realWorldExampleTitle')}
                      </div>
                      <p className="body-prose" style={{ fontSize: '14px', color: 'var(--ink)' }}>
                        <FormattedText text={currentStep.real_world_example} />
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Two-Column Part Breakdown: Architectural Flow & Guarded Source Snippet */}
            <div className="two-col-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code size={16} weight="regular" aria-hidden="true" />
                  <span style={{ fontWeight: 600 }}>{t('explorerHowPartWorks')}</span>
                </div>
                <p className="body-prose">
                  <FormattedText text={currentStep.what_happens} />
                </p>
                <p className="form-helper" style={{ color: 'var(--ink)' }}>
                  <strong>{t('explorerChestertonWhy')}</strong>{' '}
                  <FormattedText text={currentStep.why_guarded} />
                </p>
                <p className="form-helper" style={{ color: 'var(--danger)' }}>
                  <strong>{t('explorerImpactRemoved')}</strong>{' '}
                  <FormattedText text={currentStep.danger_if_removed} />
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="mono-metric" style={{ color: 'var(--ink)' }}>
                  {currentStep.file_path} • {currentStep.symbol_name}
                </div>
                <CodeBlock
                  label={`${t('explorerGuardedToken')} ${currentStep.matched_token}`}
                  code={currentStep.code_snippet}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
