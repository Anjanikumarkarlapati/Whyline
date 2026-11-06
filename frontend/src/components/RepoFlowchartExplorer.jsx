import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  Code,
  GitBranch,
  Graph,
  Pause,
  Play,
  SkipForward,
  SpeakerHigh,
} from '@phosphor-icons/react';
import { QUICK_GITHUB_REPOS, useWorkbenchSelection } from '../context/WorkbenchContext';
import { useI18n } from '../i18n';
import StatusBadge from './StatusBadge';
import { CodeBlock, FormattedText } from './CodeText';
import InteractiveFlowchartSvg from './InteractiveFlowchartSvg';

export default function RepoFlowchartExplorer({ onSelectStep, selectedStepNumber }) {
  const { lang, setLang } = useI18n();
  const { repoContext, loadGitHubRepo } = useWorkbenchSelection();

  const [githubUrl, setGithubUrl] = useState(
    repoContext?.url || 'https://github.com/HealthConnect/payment-gateway-v1'
  );
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [isWalkthroughPlaying, setIsWalkthroughPlaying] = useState(false);
  const [voiceAgentStatus, setVoiceAgentStatus] = useState('Ready');
  const [viewMode, setViewMode] = useState('steps'); // 'steps' | 'graph'

  const audioRef = useRef(null);
  const walkthroughTimerRef = useRef(null);
  const walkthroughActiveRef = useRef(false);

  const langCode = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';

  useEffect(() => {
    if (repoContext?.url && repoContext.url !== githubUrl) {
      setGithubUrl(repoContext.url);
      fetchFlowchartScan(repoContext.url, langCode, false);
    }
  }, [repoContext?.url]);

  const stopVoiceWalkthrough = () => {
    walkthroughActiveRef.current = false;
    setIsWalkthroughPlaying(false);
    setVoiceAgentStatus('Ready');
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
    setVoiceAgentStatus(`Playing Overview (${langCode})`);

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
    setVoiceAgentStatus('Building Flowchart...');
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
      setVoiceAgentStatus('Ready');
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
      audioRef.current.play().catch(() => {});
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
  const prevStep = activeStepIdx > 0 ? steps[activeStepIdx - 1] : null;
  const nextStep = activeStepIdx < steps.length - 1 ? steps[activeStepIdx + 1] : null;

  return (
    <article className="card" aria-label="GitHub Repository Flowchart and Step-by-Step Guide">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <GitBranch size={18} weight="regular" aria-hidden="true" />
            <h2 className="card-title" style={{ margin: 0 }}>
              How This Repository Works (Step-by-Step Flowchart)
            </h2>
          </div>
          <p className="form-helper" style={{ marginTop: '4px' }}>
            See how a request enters the repository, how files connect to each other, and how data moves from start to finish.
          </p>
        </div>

        <div className="chip-row" aria-live="polite">
          {flowData && (
            <span className="status-badge status-good">
              <CheckCircle size={14} weight="fill" aria-hidden="true" />
              <span className="mono-metric">
                {steps.length} Steps Ready • {langCode}
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
        {/* Row 1: GitHub Repo URL Input + Scan Action + Voice Walkthrough */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadGitHubRepo(githubUrl);
            fetchFlowchartScan(githubUrl, langCode, false);
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}
        >
          <input
            id="github-repo-url-input"
            type="text"
            className="form-input"
            style={{ flex: '1 1 260px', fontFamily: 'var(--font-mono)' }}
            aria-label="GitHub Repository URL to explain"
            placeholder="https://github.com/owner/repository"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
          />

          <button
            id="btn-scan-github-repo"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ whiteSpace: 'nowrap' }}
          >
            <ArrowsClockwise size={16} weight="regular" aria-hidden="true" />
            <span>{loading ? 'Building Flowchart...' : 'Load & Explain Repo'}</span>
          </button>

          {isWalkthroughPlaying ? (
            <button
              id="btn-stop-walkthrough"
              type="button"
              className="btn btn-danger"
              onClick={stopVoiceWalkthrough}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Pause size={16} weight="regular" aria-hidden="true" />
              <span>Stop Voice Walkthrough</span>
            </button>
          ) : (
            <button
              id="btn-play-walkthrough"
              type="button"
              className="btn btn-secondary"
              onClick={() => startStepWalkthrough(steps, 0)}
              disabled={!steps.length}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Play size={16} weight="regular" aria-hidden="true" />
              <span>Play Full Voice Walkthrough</span>
            </button>
          )}
        </form>

        {/* Row 2: Sample GitHub Repo Buttons + Voice Language Switcher */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Sample repos:
            </span>
            {QUICK_GITHUB_REPOS.map((demo) => (
              <button
                key={demo.url}
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '28px', padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                onClick={() => {
                  setGithubUrl(demo.url);
                  loadGitHubRepo(demo.url);
                  fetchFlowchartScan(demo.url, langCode, false);
                }}
              >
                <span className="mono-metric">{demo.label}</span>
              </button>
            ))}
          </div>

          <div className="segmented-control" role="group" aria-label="Voice explanation language">
            {[
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'Hindi' },
              { code: 'te', label: 'Telugu' },
            ].map((item) => (
              <button
                key={item.code}
                id={`btn-flow-lang-${item.code}`}
                type="button"
                className={`segmented-btn ${lang === item.code ? 'active' : ''}`}
                onClick={() => setLang(item.code)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Beginner Project Overview Card */}
        {flowData && (
          <div
            id="beginner-project-report-card"
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-raised)',
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
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                About This Repository (In Simple English)
              </span>
              <button
                id="btn-speak-project-summary"
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '30px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                onClick={() => playProjectSummaryAudio(flowData?.project_summary)}
              >
                <SpeakerHigh size={14} weight="regular" aria-hidden="true" />
                <span>Listen to Overview</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  What This Repository Does
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.55', color: 'var(--text-primary)' }}>
                  <FormattedText
                    text={
                      flowData?.project_summary?.simple_explanation ||
                      'This repository processes incoming requests, runs safety checks on the data, and returns a clean response.'
                    }
                  />
                </p>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Everyday Example
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.55', color: 'var(--text-primary)' }}>
                  <FormattedText
                    text={
                      flowData?.project_summary?.real_world_example ||
                      'Before removing or changing an important check in the code, you first learn why the original developer added it so you do not bring back an old bug.'
                    }
                  />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Mode Toggle: Step Cards vs Visual Diagram */}
        {steps.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Click Any Step Below to Hear Its Voice Explanation and See the Code:
            </span>
            <div className="segmented-control" role="group" aria-label="Flowchart display mode">
              <button
                type="button"
                className={`segmented-btn ${viewMode === 'steps' ? 'active' : ''}`}
                onClick={() => setViewMode('steps')}
                style={{ whiteSpace: 'nowrap' }}
              >
                Step-by-Step Cards
              </button>
              <button
                type="button"
                className={`segmented-btn ${viewMode === 'graph' ? 'active' : ''}`}
                onClick={() => setViewMode('graph')}
                style={{ whiteSpace: 'nowrap' }}
              >
                <Graph size={14} weight="regular" style={{ marginRight: '4px' }} aria-hidden="true" />
                Visual Flow Diagram
              </button>
            </div>
          </div>
        )}

        {/* Visual SVG Diagram Mode */}
        {steps.length > 0 && viewMode === 'graph' && (
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-raised)',
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

        {/* Connected 5-Step Flow Cards */}
        {steps.length > 0 && viewMode === 'steps' && (
          <div
            role="region"
            aria-label="Repository request and data flow steps"
            style={{
              padding: '18px',
              borderRadius: '12px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-raised)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
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
              <span className="mono-metric" style={{ fontWeight: 600, fontSize: '12px' }}>
                Repository: {flowData?.repo_slug || repoContext?.fullName} • Viewing Step {activeStepIdx + 1} of {steps.length}
              </span>
              <div className="chip-row">
                <button
                  id="btn-speak-current-step"
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: '30px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  onClick={() => playSingleStepAudio(currentStep)}
                >
                  <SpeakerHigh size={14} weight="regular" aria-hidden="true" />
                  <span>Play Step {activeStepIdx + 1} Audio</span>
                </button>
                <button
                  id="btn-next-flow-step"
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: '30px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    const nextIdx = (activeStepIdx + 1) % steps.length;
                    setActiveStepIdx(nextIdx);
                    playSingleStepAudio(steps[nextIdx]);
                    if (onSelectStep) {
                      onSelectStep(steps[nextIdx]);
                    }
                  }}
                >
                  <SkipForward size={14} weight="regular" aria-hidden="true" />
                  <span>Next Step ({((activeStepIdx + 1) % steps.length) + 1}/{steps.length})</span>
                </button>
              </div>
            </div>

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
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: isActive
                        ? '2px solid var(--accent)'
                        : '1px solid var(--border-default)',
                      background: isActive ? 'var(--bg-surface)' : 'var(--canvas)',
                      color: 'var(--text-primary)',
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
                      <span className="mono-metric" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        Step 0{step.step_number}
                      </span>
                      <span className="mono-metric" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {isActive ? 'Selected' : isCompleted ? 'Done' : step.phase}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '14px', lineHeight: 1.3 }}>
                      {step.title}
                    </div>

                    {step.simple_explanation && (
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          margin: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {step.simple_explanation}
                      </p>
                    )}

                    <div
                      className="mono-metric"
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      File: {step.file_path?.split('/').pop() || step.symbol_name}
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

        {/* Selected Step Detail & File Connection Breakdown */}
        {currentStep && (
          <div
            id="active-flowchart-part-panel"
            style={{
              padding: '20px 24px',
              borderRadius: '14px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
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
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <div>
                <div className="mono-metric" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Stage {currentStep.step_number} of {steps.length} • {currentStep.phase}
                </div>
                <h3 className="card-title" style={{ marginTop: '4px' }}>
                  Step {currentStep.step_number}: {currentStep.title}
                </h3>
              </div>
              <StatusBadge status={currentStep.status} />
            </div>

            {/* File Connections Strip (Incoming -> Current File -> Outgoing) */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Receives data from: </span>
                <span className="mono-metric">
                  {prevStep ? prevStep.file_path?.split('/').pop() || prevStep.title : 'User / Client Request'}
                </span>
              </div>
              <ArrowRight size={14} />
              <div>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Current File: </span>
                <span className="mono-metric" style={{ fontWeight: 700 }}>
                  {currentStep.file_path}
                </span>
              </div>
              <ArrowRight size={14} />
              <div>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Passes data to: </span>
                <span className="mono-metric">
                  {nextStep ? nextStep.file_path?.split('/').pop() || nextStep.title : 'Final Response / Output'}
                </span>
              </div>
            </div>

            {/* Voice Narration Transcript */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-raised)',
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
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                  Spoken Explanation ({currentStep.tts_language || langCode})
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: '26px', padding: '0 10px', fontSize: '11px' }}
                  onClick={() => playSingleStepAudio(currentStep)}
                >
                  <SpeakerHigh size={13} />
                  <span>Replay Step Audio</span>
                </button>
              </div>
              <p
                id="active-step-spoken-narration"
                style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)' }}
              >
                <FormattedText text={currentStep.spoken_narration} />
              </p>
            </div>

            {/* Simple Explanation & Real-World Example */}
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
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-raised)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                      In Simple Words
                    </span>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                      <FormattedText text={currentStep.simple_explanation} />
                    </p>
                  </div>
                )}

                {currentStep.real_world_example && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-raised)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Real-Life Comparison
                    </span>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                      <FormattedText text={currentStep.real_world_example} />
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Two-Column Breakdown: What Happens & Code Snippet */}
            <div className="two-col-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code size={16} weight="regular" aria-hidden="true" />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>What Happens in This File</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.55' }}>
                  <FormattedText text={currentStep.what_happens} />
                </p>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                  <strong>Why It Is Written This Way:</strong>{' '}
                  <FormattedText text={currentStep.why_guarded} />
                </p>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--danger)' }}>
                  <strong>What Breaks If Removed:</strong>{' '}
                  <FormattedText text={currentStep.danger_if_removed} />
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="mono-metric" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                  {currentStep.file_path} • {currentStep.symbol_name}
                </div>
                <CodeBlock
                  label={`Key Code Line: ${currentStep.matched_token}`}
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
