import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClockCounterClockwise, GitBranch } from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import IncidentsAndMemoryPage from './IncidentsAndMemoryPage';
import GitFlowchartPage from './GitFlowchartPage';
import MemoryDetailDrawer from '../components/memory/MemoryDetailDrawer';

export default function MemoryPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentView = searchParams.get('view') || 'ledger';
  const incidentParam = searchParams.get('incident');
  const focusParam = searchParams.get('focus');

  const [selectedItem, setSelectedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-open drawer if deep linked with ?incident=<id> or ?focus=<id>
  useEffect(() => {
    if (incidentParam) {
      setSelectedItem({
        type: 'incident',
        id: incidentParam,
        title:
          incidentParam === 'INC-9921'
            ? 'Midnight Settlement Packet Drop (18% dropped transactions)'
            : `${incidentParam} Investigation`,
        service: 'HealthConnect Payment Gateway v1',
        linkedFenceId: 'FENCE-001',
        file: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
        line: 23,
        status: 'RESOLVED',
        postmortem:
          'gateway router lo retry count = 5 alage unchandi, Razorpay v1 midnight packet drop inka reproduce avtundi until gateway.version v2 deploy chestaru.',
        audioUrl: '/api/audio/FENCE-001.wav',
      });
      setDrawerOpen(true);
    } else if (focusParam) {
      setSelectedItem({
        type: 'node',
        id: focusParam,
        title: `Flowchart Node • ${focusParam}`,
        service: 'HealthConnect Payment Gateway v1',
        linkedFenceId: focusParam.startsWith('FENCE') ? focusParam : 'FENCE-001',
        file: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
        line: 23,
        status: 'VERIFIED_ACTIVE',
        postmortem:
          'Step-by-step git provenance verifies this AST fence was established in PR #212 by @anjani.',
        audioUrl: '/api/audio/FENCE-001.wav',
      });
      setDrawerOpen(true);
    }
  }, [incidentParam, focusParam]);

  const handleSelectView = (view) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('view', view);
    setSearchParams(updated, { replace: true });
  };

  const handleSelectIncident = (inc) => {
    setSelectedItem({
      type: 'incident',
      id: inc.id,
      title: inc.title,
      service: inc.service || 'HealthConnect Payment Gateway v1',
      linkedFenceId: inc.linked_fence_id || 'FENCE-001',
      file: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
      line: 23,
      status: 'RESOLVED',
      postmortem: inc.voice_postmortem,
      audioUrl: '/api/audio/FENCE-001.wav',
    });
    setDrawerOpen(true);
    const updated = new URLSearchParams(searchParams);
    updated.set('incident', inc.id);
    setSearchParams(updated, { replace: true });
  };

  const handleSelectNode = (node) => {
    const nodeId = node.id || 'NODE-001';
    setSelectedItem({
      type: 'node',
      id: nodeId,
      title: node.label || `Node ${nodeId}`,
      service: 'HealthConnect Payment Gateway v1',
      linkedFenceId: 'FENCE-001',
      file: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
      line: 23,
      status: 'VERIFIED_ACTIVE',
      postmortem: node.narration_text || 'Active git provenance node in repository graph.',
      audioUrl: '/api/audio/FENCE-001.wav',
    });
    setDrawerOpen(true);
    const updated = new URLSearchParams(searchParams);
    updated.set('focus', nodeId);
    setSearchParams(updated, { replace: true });
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    const updated = new URLSearchParams(searchParams);
    updated.delete('incident');
    updated.delete('focus');
    setSearchParams(updated, { replace: true });
  };

  return (
    <div className="page-stack">
      <header
        className="context-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <p className="context-meta">Memory &amp; Provenance • HealthConnect</p>
          <h1 className="page-title">{currentView === 'graph' ? t('viewGraph') : t('viewLedger')}</h1>
        </div>

        {/* View Segmented Control */}
        <div
          className="segmented-control"
          role="tablist"
          aria-label="Memory view mode"
          style={{
            display: 'inline-flex',
            background: 'var(--bg-raised)',
            padding: '3px',
            borderRadius: '999px',
            border: '1px solid var(--border-default)',
          }}
        >
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
          <GitFlowchartPage
            onSelectNode={handleSelectNode}
            focusNodeId={focusParam}
            hideHeader={true}
          />
        ) : (
          <IncidentsAndMemoryPage
            onSelectIncident={handleSelectIncident}
            highlightIncidentId={incidentParam}
            hideHeader={true}
          />
        )}
      </div>

      <MemoryDetailDrawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        item={selectedItem}
      />
    </div>
  );
}
