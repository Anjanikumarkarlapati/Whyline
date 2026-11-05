import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  Brain,
  CheckCircle,
  Code,
  GitBranch,
  Graph,
  Lightbulb,
  Pause,
  Play,
  SkipForward,
  SpeakerHigh,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import StatusBadge from './StatusBadge';
import { CodeBlock, FormattedText } from './CodeText';
import InteractiveFlowchartSvg from './InteractiveFlowchartSvg';
import { useKbPress } from '../hooks/useKbPress';

const DEMO_REPOS = [
  {
    label: 'healthconnect-india/payment-gateway-service',
    url: 'https://github.com/healthconnect-india/payment-gateway-service',
  },
  {
    label: 'whyline-labs/clinical-dicom-pipeline',
    url: 'https://github.com/whyline-labs/clinical-dicom-pipeline',
  },
];

export default function RepoFlowchartExplorer({ onSelectStep, selectedStepNumber }) {
  const { lang, setLang } = useI18n();
  const [githubUrl, setGithubUrl] = useState(
    'https://github.com/healthconnect-india/payment-gateway-service'
  );
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [isWalkthroughPlaying, setIsWalkthroughPlaying] = useState(false);
  const [voiceAgentStatus, setVoiceAgentStatus] = useState('Idle');
  const [viewMode, setViewMode] = useState('steps'); // 'steps' | 'graph'

  const audioRef = useRef(null);
  const walkthroughTimerRef = useRef(null);
  const walkthroughActiveRef = useRef(false);

  const langCode = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';

  const stopVoiceWalkthrough = () => {
    walkthroughActiveRef.current = false;
    setIsWalkthroughPlaying(false);
    setVoiceAgentStatus('Idle');
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

  const playProjectSummaryAudio = (projectSummary) => {
    if (!projectSummary) return;
    stopVoiceWalkthrough();
    setVoiceAgentStatus(`Speaking Project Summary (${langCode} • Gnani Voice)`);

    if (projectSummary.audio_url) {
      if (!audioRef.current) {
        audioRef.current = new Audio(projectSummary.audio_url);
      } else {
        audioRef.current.src = projectSummary.audio_url;
      }
      audioRef.current.onended = () => setVoiceAgentStatus('Ready');
      audioRef.current.onerror = () => setVoiceAgentStatus('Ready');
      audioRef.current.play().catch(() => {
        setVoiceAgentStatus('Ready');
      });
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const text = `${projectSummary.simple_explanation || ''} ${projectSummary.real_world_example || ''}`;
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = langCode;
        utter.onend = () => setVoiceAgentStatus('Ready');
        window.speechSynthesis.speak(utter);
      } catch {
        setVoiceAgentStatus('Ready');
      }
    }
  };

  const fetchFlowchartScan = async (targetUrl, targetLangCode, autoPlayWalkthrough = false) => {
    stopVoiceWalkthrough();
    setLoading(true);
    setVoiceAgentStatus('Scanning Repo');
    try {
      const resp = await fetch('/api/repo/scan-flowchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_url: targetUrl || githubUrl,
          language: targetLangCode || langCode,
        }),
      });
      const json = await resp.json();
      setFlowData(json);
      setActiveStepIdx(0);
      setVoiceAgentStatus('Ready');
      if (json?.steps?.length > 0 && onSelectStep) {
        onSelectStep(json.steps[0]);
      }
      if (autoPlayWalkthrough && json?.steps?.length > 0) {
        startStepWalkthrough(json.steps, 0);
      }
    } catch {
      setVoiceAgentStatus('Idle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowchartScan(githubUrl, langCode, false);
    return () => stopVoiceWalkthrough();
  }, [lang]);

  useEffect(() => {
    if (selectedStepNumber && flowData?.steps) {
      const foundIdx = flowData.steps.findIndex((s) => s.step_number === selectedStepNumber);
      if (foundIdx >= 0 && foundIdx !== activeStepIdx) {
        setActiveStepIdx(foundIdx);
      }
    }
  }, [selectedStepNumber, flowData]);

  const playSingleStepAudio = (stepObj, onComplete) => {
    if (!stepObj) return;
    setVoiceAgentStatus(`Speaking Step ${stepObj.step_number} (${stepObj.tts_language || langCode})`);

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
        setVoiceAgentStatus('Ready');
      }
    };

    // Initial fallback timer in case audio fails to load or autoplay is blocked
    walkthroughTimerRef.current = setTimeout(finishOnce, 3500);

    if (stepObj.audio_url) {
      if (!audioRef.current) {
        audioRef.current = new Audio(stepObj.audio_url);
      } else {
        audioRef.current.src = stepObj.audio_url;
      }
      audioRef.current.onloadedmetadata = () => {
        if (!finished && walkthroughTimerRef.current && audioRef.current?.duration > 0) {
          clearTimeout(walkthroughTimerRef.current);
          const waitMs = Math.min(25000, Math.ceil(audioRef.current.duration * 1000) + 1200);
          walkthroughTimerRef.current = setTimeout(finishOnce, waitMs);
        }
      };
      audioRef.current.onended = finishOnce;
      audioRef.current.onerror = finishOnce;
      audioRef.current.play().catch(() => {
        // Headless browser autoplay fallback handled by timer
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
        setVoiceAgentStatus('Walkthrough Complete');
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

  // Keyboard 3D press-effect handlers for action buttons
  const kbScan = useKbPress(() => fetchFlowchartScan(githubUrl, langCode, true));
  const kbStop = useKbPress(stopVoiceWalkthrough);
  const kbPlay = useKbPress(() => startStepWalkthrough(steps, 0));
  const kbSpeakSummary = useKbPress(() => playProjectSummaryAudio(flowData?.project_summary));
  const kbSpeakStep = useKbPress(() => playSingleStepAudio(currentStep));
  const kbNextStep = useKbPress(() => {
    const nextIdx = (activeStepIdx + 1) % steps.length;
    setActiveStepIdx(nextIdx);
    playSingleStepAudio(steps[nextIdx]);
    if (onSelectStep) onSelectStep(steps[nextIdx]);
  });

  return (
    <article className="card" aria-label="GitHub Repository Deep Scanner and Voice Flowchart">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <GitBranch size={18} weight="regular" aria-hidden="true" />
            <h2 className="card-title" style={{ margin: 0 }}>
              GitHub Repository Flowchart Scanner &amp; Step-by-Step Voice Agent
            </h2>
          </div>
          <p className="form-helper" style={{ marginTop: '4px' }}>
            Deep AST + Git blame scan rendered as an interactive part-wise flowchart with Gnani Vachana{' '}
            <code className="inline-code">timbre-v2.5</code> &amp;{' '}
            <code className="inline-code">gemini-3.8-flash</code> voice narration in Telugu, Hindi, and English.
          </p>
        </div>

        <div className="chip-row" aria-live="polite">
          {flowData && (
            <span className="status-badge status-good">
              <CheckCircle size={14} weight="fill" aria-hidden="true" />
              <span className="mono-metric">
                {flowData.scan_latency_ms} ms • {flowData.gnani_language?.toUpperCase()} • Nalini
              </span>
            </span>
          )}
          <span className="status-badge status-muted">
            <SpeakerHigh size={14} weight="regular" aria-hidden="true" />
            <span className="mono-metric">{voiceAgentStatus}</span>
          </span>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Row 1: GitHub Repo URL Input + Language Switcher + Scan Action */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchFlowchartScan(githubUrl, langCode, true);
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}
        >
          <input
            id="github-repo-url-input"
            type="url"
            className="form-input"
            style={{ flex: 1, minWidth: '260px', fontFamily: 'var(--font-mono)' }}
            aria-label="GitHub Repository URL to scan"
            placeholder="https://github.com/owner/repository"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
          />

          <button
            id="btn-scan-github-repo"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            {...kbScan}
          >
            <ArrowsClockwise size={16} weight="regular" aria-hidden="true" />
            <span>{loading ? 'Scanning Repo…' : 'Scan GitHub Repo & Explain'}</span>
          </button>

          {isWalkthroughPlaying ? (
            <button
              id="btn-stop-walkthrough"
              type="button"
              className="btn btn-danger"
              onClick={stopVoiceWalkthrough}
              {...kbStop}
            >
              <Pause size={16} weight="regular" aria-hidden="true" />
              <span>Stop Voice Agent</span>
            </button>
          ) : (
            <button
              id="btn-play-walkthrough"
              type="button"
              className="btn btn-secondary"
              onClick={() => startStepWalkthrough(steps, 0)}
              disabled={!steps.length}
              {...kbPlay}
            >
              <Play size={16} weight="regular" aria-hidden="true" />
              <span>Play Step-by-Step Voice Walkthrough</span>
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
                className="filter-chip"
                onClick={() => {
                  setGithubUrl(demo.url);
                  fetchFlowchartScan(demo.url, langCode, false);
                }}
              >
                <span className="mono-metric">{demo.label}</span>
              </button>
            ))}
          </div>

          <div className="segmented-control" role="group" aria-label="Voice agent language">
            {[
              { code: 'te', label: 'తెలుగు (Telugu)' },
              { code: 'hi', label: 'हिंदी (Hindi)' },
              { code: 'en', label: 'English (EN)' },
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

        {/* Beginner Project Report Card (Gemini Brain Summary & Gnani Audio) */}
        {flowData && (
          <div
            id="beginner-project-report-card"
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--hairline-strong)',
              backgroundColor: 'var(--surface-raised)',
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
                <Brain size={18} weight="fill" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                <span className="small-caps" style={{ fontWeight: 600 }}>
                  Beginner Project Report Card • Gemini API Reasoning
                </span>
              </div>
              <button
                id="btn-speak-project-summary"
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '32px', padding: '0 12px' }}
                onClick={() => playProjectSummaryAudio(flowData?.project_summary)}
                {...kbSpeakSummary}
              >
                <SpeakerHigh size={14} weight="regular" aria-hidden="true" />
                <span>Speak Project Summary (Gnani Voice)</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span className="small-caps" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                  What This Project Does (In Simple Terms)
                </span>
                <p className="body-prose" style={{ margin: '3px 0 0', fontWeight: 500, color: 'var(--ink)' }}>
                  <FormattedText
                    text={
                      flowData?.project_summary?.simple_explanation ||
                      'WhyLine acts as an architectural black box recorder and safety guardrail that scans code repositories to find historical bug fences and prevent repeat outages.'
                    }
                  />
                </p>
              </div>

              <div>
                <span className="small-caps" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                  How It Works (Real-Life Example)
                </span>
                <p className="body-prose" style={{ margin: '3px 0 0', color: 'var(--ink)' }}>
                  💡{' '}
                  <FormattedText
                    text={
                      flowData?.project_summary?.real_world_example ||
                      "Think of Chesterton's fence: before removing an odd wooden fence across a mountain pass, you first discover why the town built it (to stop rockfalls), so you don't rebuild the exact disaster."
                    }
                  />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Mode Toggle: Part-by-Part Cards vs Interactive SVG Graph */}
        {steps.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <div className="segmented-control" role="group" aria-label="Flowchart view style">
              <button
                type="button"
                className={`segmented-btn ${viewMode === 'steps' ? 'active' : ''}`}
                onClick={() => setViewMode('steps')}
              >
                5-Stage Flowchart
              </button>
              <button
                type="button"
                className={`segmented-btn ${viewMode === 'graph' ? 'active' : ''}`}
                onClick={() => setViewMode('graph')}
              >
                <Graph size={14} weight="regular" style={{ marginRight: '4px' }} aria-hidden="true" />
                SVG Graph
              </button>
            </div>
          </div>
        )}

        {/* Row 3: Interactive Visual Flowchart (Part-by-Part Node Pipeline or SVG Graph) */}
        {steps.length > 0 && viewMode === 'graph' && (
          <div
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--hairline)',
              background: 'var(--surface-raised)',
            }}
          >
            <InteractiveFlowchartSvg
              graph={
                flowData?.graph || {
                  nodes: steps.map((s, idx) => ({
                    id: s.node_id,
                    label: s.title,
                    category: s.phase,
                    position: { x: (idx % 3) * 230 + 20, y: Math.floor(idx / 3) * 110 + 20 },
                  })),
                  edges: steps.slice(0, -1).map((s, idx) => ({
                    id: `e-${idx}`,
                    source: s.node_id,
                    target: steps[idx + 1].node_id,
                    label: 'next',
                  })),
                }
              }
              activeId={currentStep?.node_id}
              doneIds={steps.slice(0, activeStepIdx).map((s) => s.node_id)}
              onSelect={(nodeId) => {
                const foundIdx = steps.findIndex((s) => s.node_id === nodeId);
                if (foundIdx >= 0) {
                  stopVoiceWalkthrough();
                  setActiveStepIdx(foundIdx);
                  playSingleStepAudio(steps[foundIdx]);
                  if (onSelectStep) {
                    onSelectStep(steps[foundIdx]);
                  }
                }
              }}
            />
          </div>
        )}

        {steps.length > 0 && viewMode === 'steps' && (
          <div
            role="region"
            aria-label="Repository execution and spoken fence flowchart"
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
                Repo: {flowData?.repo_slug} • {flowData?.scan_summary?.ast_anomalies_found || 10} Guarded Fences •
                Part {activeStepIdx + 1} of {steps.length}
              </span>
              <div className="chip-row">
                <button
                  id="btn-speak-current-step"
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: '32px', padding: '0 12px' }}
                  onClick={() => playSingleStepAudio(currentStep)}
                  {...kbSpeakStep}
                >
                  <SpeakerHigh size={14} weight="regular" aria-hidden="true" />
                  <span>Speak Part {activeStepIdx + 1}</span>
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
                    if (onSelectStep) {
                      onSelectStep(steps[nextIdx]);
                    }
                  }}
                  {...kbNextStep}
                >
                  <SkipForward size={14} weight="regular" aria-hidden="true" />
                  <span>Next Part ({((activeStepIdx + 1) % steps.length) + 1}/{steps.length})</span>
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
                      if (onSelectStep) {
                        onSelectStep(step);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.currentTarget.setAttribute('data-pressing', '');
                        stopVoiceWalkthrough();
                        setActiveStepIdx(idx);
                        playSingleStepAudio(step);
                        if (onSelectStep) onSelectStep(step);
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') e.currentTarget.removeAttribute('data-pressing');
                    }}
                    onBlur={(e) => e.currentTarget.removeAttribute('data-pressing')}
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
                        Step 0{step.step_number}
                      </span>
                      <span className="mono-metric" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                        {isActive ? 'ACTIVE PART' : isCompleted ? 'EXPLAINED' : step.fence_id}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '14px', lineHeight: 1.3 }}>
                      {step.title}
                    </div>

                    {step.simple_explanation && (
                      <p
                        className="body-prose"
                        style={{
                          fontSize: '12px',
                          color: 'var(--ink)',
                          margin: 0,
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {step.simple_explanation}
                      </p>
                    )}

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
                  Part {currentStep.step_number}: {currentStep.title}
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
                }}
              >
                <span className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
                  Gnani Vachana Voice Agent ({currentStep.tts_language || langCode} • timbre-v2.5 •{' '}
                  {currentStep.tts_provider_mode || 'live'})
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
            </div>

            {/* Gemini Brain Simple Explanation & Real-Life Metaphor */}
            {(currentStep.simple_explanation || currentStep.real_world_example) && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '12px',
                }}
              >
                {currentStep.simple_explanation && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--hairline)',
                      background: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Brain size={15} weight="fill" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                      <span className="small-caps" style={{ fontWeight: 600 }}>
                        In Simple Terms (Gemini Brain)
                      </span>
                    </div>
                    <p className="body-prose" style={{ margin: 0, fontSize: '14px', color: 'var(--ink)' }}>
                      <FormattedText text={currentStep.simple_explanation} />
                    </p>
                  </div>
                )}

                {currentStep.real_world_example && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--hairline)',
                      background: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lightbulb size={15} weight="fill" style={{ color: 'var(--warning)' }} aria-hidden="true" />
                      <span className="small-caps" style={{ fontWeight: 600 }}>
                        Real-Life Everyday Analogy
                      </span>
                    </div>
                    <p className="body-prose" style={{ margin: 0, fontSize: '14px', color: 'var(--ink)' }}>
                      <FormattedText text={currentStep.real_world_example} />
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Two-Column Part Breakdown: Architectural Flow & Guarded Source Snippet */}
            <div className="two-col-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code size={16} weight="regular" aria-hidden="true" />
                  <span style={{ fontWeight: 600 }}>How this Flowchart Part Works</span>
                </div>
                <p className="body-prose">
                  <FormattedText text={currentStep.what_happens} />
                </p>
                <p className="form-helper" style={{ color: 'var(--ink)' }}>
                  <strong>Chesterton&apos;s Fence Why:</strong>{' '}
                  <FormattedText text={currentStep.why_guarded} />
                </p>
                <p className="form-helper" style={{ color: 'var(--danger)' }}>
                  <strong>Impact if removed:</strong>{' '}
                  <FormattedText text={currentStep.danger_if_removed} />
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="mono-metric" style={{ color: 'var(--ink)' }}>
                  {currentStep.file_path} • {currentStep.symbol_name}
                </div>
                <CodeBlock
                  label={`Guarded Token: ${currentStep.matched_token}`}
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
