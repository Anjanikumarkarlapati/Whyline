import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ChatCircleText,
  ClockCounterClockwise,
  Code,
  FileCode,
  Graph,
  SpeakerHigh,
  Trash,
} from '@phosphor-icons/react';
import { useWorkbenchSelection } from '../context/WorkbenchContext';
import WorkbenchEditor from '../components/workbench/WorkbenchEditor';
import AskTabPanel from '../components/workbench/AskTabPanel';

export default function AnswersPage({ theme }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('panel') === 'ask' ? 'ask' : 'answers';
  const [leftTab, setLeftTab] = useState(initialTab);

  const {
    repoContext,
    selectLocation,
    currentQuery,
    setCurrentQuery,
    latestResponse,
    setLatestResponse,
    latestAudioUrl,
    setLatestAudioUrl,
    qaHistory,
    clearQaHistory,
  } = useWorkbenchSelection();

  const handlePlaySavedAudio = (url, spokenText) => {
    const targetUrl = url || latestAudioUrl || '/api/audio/fence-001.wav';
    try {
      const a = new Audio(targetUrl);
      a.play().catch(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && spokenText) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(spokenText);
          window.speechSynthesis.speak(utter);
        }
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="page-stack workbench-page-stack animate-fade-slide-up" style={{ width: '100%' }}>
      {/* Header */}
      <section
        className="context-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '8px',
        }}
      >
        <div>
          <p className="context-meta" style={{ marginBottom: '4px' }}>
            Repository Answers &amp; Code Reader • <span className="font-mono tabular-nums">{repoContext?.fullName || 'HealthConnect/payment-gateway-v1'}</span>
          </p>
          <h1 className="page-title" style={{ margin: 0, fontSize: 'var(--fluid-h1)' }}>
            Answers from the Repository
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Read the plain-English explanation on the left and inspect the exact file and line numbers in the code viewer on the right.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            style={{ whiteSpace: 'nowrap' }}
          >
            <ChatCircleText size={16} weight="regular" />
            <span>Go to Ask Repo</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/flowcharts')}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Graph size={16} weight="regular" />
            <span>View Repo Flowchart</span>
          </button>
        </div>
      </section>

      {/* Two-Column Split: Left = Plain-English Answer & Saved Questions, Right = Code Viewer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Answer Breakdown & Quick Ask Toggle */}
        <div
          className="card"
          style={{
            padding: '18px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Segmented Switch between Answer Summary and Ask Bar */}
          <div
            className="segmented-control"
            role="tablist"
            aria-label="Answers view mode"
            style={{
              display: 'flex',
              background: 'var(--bg-raised)',
              padding: '4px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--border-default)',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={leftTab === 'answers'}
              className={`btn ${leftTab === 'answers' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                flex: 1,
                borderRadius: 'var(--radius-nested)',
                minHeight: '34px',
                fontSize: '13px',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
              }}
              onClick={() => setLeftTab('answers')}
            >
              <Code size={15} weight="regular" />
              <span>Answer &amp; Code Details</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={leftTab === 'ask'}
              className={`btn ${leftTab === 'ask' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                flex: 1,
                borderRadius: 'var(--radius-nested)',
                minHeight: '34px',
                fontSize: '13px',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
              }}
              onClick={() => setLeftTab('ask')}
            >
              <ChatCircleText size={15} weight="regular" />
              <span>Ask Another Question</span>
            </button>
          </div>

          {leftTab === 'ask' ? (
            <AskTabPanel
              compact={true}
              onQuestionAnswered={() => {
                setLeftTab('answers');
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Current Question & Plain-English Answer */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-nested)',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                    Asked Question
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '28px', padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    onClick={() =>
                      handlePlaySavedAudio(latestAudioUrl, latestResponse?.spoken_reply)
                    }
                  >
                    <SpeakerHigh size={14} weight="fill" />
                    <span>Play Voice Answer</span>
                  </button>
                </div>

                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {latestResponse?.question || currentQuery}
                </div>

                <div
                  style={{
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-default)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Answer in Simple English:
                  </div>
                  {latestResponse?.spoken_reply ||
                    'Ask any question on the Ask Repo page to see the plain-English answer here.'}
                </div>
              </div>

              {/* Why This Code Is Written This Way & Important Rule */}
              {(latestResponse?.executed_task || latestResponse?.guardrail_rule) && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-nested)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Why This Code Matters
                  </span>

                  {latestResponse?.executed_task?.action_taken && (
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                      {latestResponse.executed_task.action_taken}
                    </p>
                  )}

                  {latestResponse?.guardrail_rule && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-nested-sm)',
                        background: 'var(--accent-wash)',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <strong>Important Rule:</strong> {latestResponse.guardrail_rule}
                    </div>
                  )}

                  {latestResponse?.recommended_patch && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Suggested Safe Code Change:
                      </span>
                      <pre
                        className="code-block tabular-nums"
                        style={{
                          margin: 0,
                          padding: '12px',
                          fontSize: '12px',
                          lineHeight: '1.5',
                          background: 'var(--bg-raised)',
                          borderRadius: 'var(--radius-nested-sm)',
                          overflowX: 'auto',
                        }}
                      >
                        {latestResponse.recommended_patch}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Files & Line Numbers Referenced */}
              {latestResponse?.referenced_files && latestResponse.referenced_files.length > 0 && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-nested)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Files Used in This Answer (Click to View in Code Reader)
                  </span>

                  {latestResponse.referenced_files.map((cite, idx) => (
                    <div
                      key={`${cite.file_path}-${idx}`}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-nested-sm)',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}
                      >
                        <span className="mono-metric tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                          {cite.file_path} (Line {cite.line_number})
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ minHeight: '28px', padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                          onClick={() =>
                            selectLocation({
                              file: cite.file_path,
                              line: cite.line_number || 1,
                            })
                          }
                        >
                          <FileCode size={13} weight="regular" />
                          <span>Go to Line <span className="tabular-nums">{cite.line_number}</span></span>
                          <ArrowRight size={11} />
                        </button>
                      </div>

                      {cite.explanation && (
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          {cite.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Step-by-Step Options / Recommended Approaches */}
              {latestResponse?.strategies && latestResponse.strategies.length > 0 && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-nested)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Safe Ways to Update This Code
                  </span>

                  {latestResponse.strategies.map((strat) => (
                    <div
                      key={strat.rank}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-nested-sm)',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>
                          Option <span className="tabular-nums">{strat.rank}</span>: {strat.title}
                        </span>
                        <span className="mono-metric tabular-nums" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {strat.risk_level} RISK
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                        {strat.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Questions History */}
              {qaHistory && qaHistory.length > 0 && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-nested)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ClockCounterClockwise size={16} weight="regular" style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>
                        Recent Questions (<span className="tabular-nums">{qaHistory.length}</span>)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                      onClick={clearQaHistory}
                    >
                      <Trash size={12} />
                      <span>Clear List</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {qaHistory.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCurrentQuery(item.question);
                          setLatestResponse(item.response);
                          if (item.response?.audio_url) {
                            setLatestAudioUrl(item.response.audio_url);
                          }
                          if (item.response?.executed_task?.target_file) {
                            selectLocation({
                              file: item.response.executed_task.target_file,
                              line: item.response.executed_task.target_line || 1,
                            });
                          }
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-nested-sm)',
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--border-default)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <span className="mono-metric">{item.repoFullName}</span>
                          <span className="mono-metric">{item.language}</span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.question}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Repository Source Code Viewer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <WorkbenchEditor theme={theme} />
        </div>
      </div>
    </div>
  );
}
