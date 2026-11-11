import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatCircleText, Code, Graph } from '@phosphor-icons/react';
import { useWorkbenchSelection } from '../context/WorkbenchContext';
import AskTabPanel from '../components/workbench/AskTabPanel';
import RepoFlowchartExplorer from '../components/RepoFlowchartExplorer';

export default function AskRepoPage() {
  const navigate = useNavigate();
  const { repoContext, selectLocation } = useWorkbenchSelection();

  return (
    <div className="page-stack animate-fade-slide-up" style={{ maxWidth: '980px', margin: '0 auto', width: '100%' }}>
      {/* Beginner-Friendly Header */}
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
            GitHub Repository Guide • <span className="font-mono tabular-nums">{repoContext?.fullName || 'HealthConnect/payment-gateway-v1'}</span>
          </p>
          <h1 className="page-title" style={{ margin: 0, fontSize: 'var(--fluid-h1)' }}>
            Ask the Repository Any Question
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '15px',
              color: 'var(--text-secondary)',
              maxWidth: '68ch',
              lineHeight: '1.55',
            }}
          >
            New to this codebase? Paste a GitHub link below, pick a starter question or ask your own by voice or text, and get a clear answer in plain English, Hindi, or Telugu.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/answers')}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Code size={16} weight="regular" />
            <span>View Answers &amp; Code</span>
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

      {/* Quick 3-Step Beginner Guide Strip with Spring Elevation */}
      <section
        aria-label="How to use WhyLine"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          className="card guide-step-card card-interactive"
          style={{
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-control)',
          }}
        >
          <div className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
            01. Choose a Repository
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
            Paste any public GitHub URL or click one of the sample projects to load its code files.
          </p>
        </div>

        <div
          className="card guide-step-card card-interactive"
          style={{
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-control)',
          }}
        >
          <div className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
            02. Ask Your Doubt
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
            Type a question, use the microphone to speak, or click a starter question to see how a file works.
          </p>
        </div>

        <div
          className="card guide-step-card card-interactive"
          style={{
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-control)',
          }}
        >
          <div className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
            03. Hear &amp; Inspect the Code
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
            Listen to the spoken reply, read the simple explanation, and jump straight to the exact file and line number.
          </p>
        </div>
      </section>

      {/* Main Interactive Ask Repo Workspace */}
      <AskTabPanel />

      {/* Integrated Interactive Flowchart & Voice Walkthrough */}
      <RepoFlowchartExplorer
        onSelectStep={(step) => {
          if (step?.file_path) {
            const parsedLine =
              step.line_start ||
              step.target_line ||
              parseInt(String(step.line_range || '1').split('-')[0], 10) ||
              1;
            selectLocation({
              file: step.file_path,
              line: parsedLine,
            });
          }
        }}
      />
    </div>
  );
}
