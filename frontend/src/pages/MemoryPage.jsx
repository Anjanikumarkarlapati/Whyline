import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClockCounterClockwise, GitBranch } from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import IncidentsAndMemoryPage from './IncidentsAndMemoryPage';
import GitFlowchartPage from './GitFlowchartPage';

export default function MemoryPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'ledger';

  const handleSelectView = (view) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('view', view);
    setSearchParams(updated, { replace: true });
  };

  return (
    <div className="page-stack">
      <header className="context-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p className="context-meta">Memory &amp; Provenance • HealthConnect</p>
          <h1 className="page-title">{currentView === 'graph' ? t('viewGraph') : t('viewLedger')}</h1>
        </div>

        {/* View Segmented Control */}
        <div className="segmented-control" role="tablist" aria-label="Memory view mode" style={{ display: 'inline-flex', background: 'var(--bg-raised)', padding: '3px', borderRadius: '999px', border: '1px solid var(--border-default)' }}>
          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'ledger'}
            className={`btn ${currentView === 'ledger' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '999px', minHeight: '34px', padding: '0 16px', fontSize: '13px' }}
            onClick={() => handleSelectView('ledger')}
          >
            <ClockCounterClockwise size={16} weight="regular" aria-hidden="true" />
            <span>{t('viewLedger')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'graph'}
            className={`btn ${currentView === 'graph' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '999px', minHeight: '34px', padding: '0 16px', fontSize: '13px' }}
            onClick={() => handleSelectView('graph')}
          >
            <GitBranch size={16} weight="regular" aria-hidden="true" />
            <span>{t('viewGraph')}</span>
          </button>
        </div>
      </header>

      <div className="memory-view-content" style={{ minHeight: '500px' }}>
        {currentView === 'graph' ? (
          <GitFlowchartPage />
        ) : (
          <IncidentsAndMemoryPage />
        )}
      </div>
    </div>
  );
}
