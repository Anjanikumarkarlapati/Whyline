import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatCircleText, Code } from '@phosphor-icons/react';
import { useWorkbenchSelection } from '../context/WorkbenchContext';
import RepoFlowchartExplorer from '../components/RepoFlowchartExplorer';

export default function FlowchartsPage() {
  const navigate = useNavigate();
  const { repoContext, selectLocation } = useWorkbenchSelection();

  return (
    <div className="page-stack" style={{ width: '100%' }}>
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
            Visual Architecture Guide • {repoContext?.fullName || 'HealthConnect/payment-gateway-v1'}
          </p>
          <h1 className="page-title" style={{ margin: 0 }}>
            GitHub Repository Flowcharts
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '68ch' }}>
            Explore how requests move through the codebase step by step, see which files depend on each other, and listen to plain-English voice explanations.
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
            <span>Ask Repo a Question</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/answers')}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Code size={16} weight="regular" />
            <span>View Answers &amp; Code</span>
          </button>
        </div>
      </section>

      {/* Main Interactive Flowchart Explorer */}
      <RepoFlowchartExplorer
        onSelectStep={(step) => {
          if (step?.file_path) {
            selectLocation({
              file: step.file_path,
              line: step.line_start || 1,
            });
          }
        }}
      />
    </div>
  );
}
