import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  GitBranch,
  Microphone,
  SpeakerHigh,
  WarningOctagon,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import { FormattedText } from '../components/CodeText';

export default function IncidentsAndMemoryPage({ onSelectIncident, highlightIncidentId, hideHeader = false }) {
  const { lang, t } = useI18n();
  const [incidents, setIncidents] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [assumptions, setAssumptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [incidentId, setIncidentId] = useState('INC-10204');
  const [serviceName, setServiceName] = useState('HealthConnect Payment Gateway v1');
  const [voicePostmortem, setVoicePostmortem] = useState(
    'gateway router lo retry count = 5 alage unchandi, Razorpay v1 midnight packet drop inka reproduce avtundi.'
  );

  const [branchName, setBranchName] = useState('fix/payment-double-charge');
  const [deadEndInput, setDeadEndInput] = useState(
    'Dropping retryCount from 5 to 1 in GatewayRouter.java caused 18% midnight settlement packet drop'
  );
  const [nextActionInput, setNextActionInput] = useState(
    'Attach deterministic X-Idempotency-Key header before upgrading gateway.version to v2'
  );

  const loadData = async () => {
    try {
      const resp = await fetch('/api/incidents');
      const data = await resp.json();
      setIncidents(data.incidents || []);
      setCheckpoints(data.checkpoints || []);
      setAssumptions(data.assumptions || []);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const handleTriggerWebhook = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/incidents/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: incidentId,
          source: 'PagerDuty Webhook',
          service: serviceName,
          title: 'Midnight Settlement SYN Packet Drop',
          oncall_engineer: '@anjani',
          language: lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN',
          voice_postmortem: voicePostmortem,
          linked_fence_id: 'FENCE-001',
        }),
      });
      if (!resp.ok) throw new Error('Failed to record incident webhook');
      await loadData();
      showToast(`Captured incident postmortem ${incidentId} and linked to FENCE-001.`);
    } catch (err) {
      showToast(`Webhook error: ${err.message || err}`);
    }
  };

  const handleSaveCheckpoint = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_name: branchName,
          action: 'pause',
          author_handle: '@anjani',
          summary: 'Branch debugging checkpoint via whyline pause',
          ruled_out_dead_ends: [deadEndInput],
          next_untested_action: nextActionInput,
        }),
      });
      if (!resp.ok) throw new Error('Failed to save checkpoint');
      await loadData();
      showToast(`Saved branch checkpoint for ${branchName}.`);
    } catch (err) {
      showToast(`Checkpoint error: ${err.message || err}`);
    }
  };

  const playAudio = (url) => {
    if (!url) return;
    try {
      const audio = new Audio(url);
      audio.play().catch((err) => {
        console.warn('Audio play failed:', err);
      });
    } catch (err) {
      console.warn('Audio initialization failed:', err);
    }
  };

  return (
    <div className="page-stack">
      {!hideHeader && (
        <section className="context-header">
          <div>
            <p className="context-meta">{t('incidentsContext')}</p>
            <h1 className="page-title">{t('incidentsTitle')}</h1>
          </div>
        </section>
      )}

      {/* Two-Column Layout: Incident Form Left, Branch Checkpoints Right */}
      <section className="two-col-grid">
        {/* Left Column: Incident-First Capture Form + Recorded Incidents */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title">{t('incidentFormTitle')}</h2>
            <StatusBadge status="VERIFIED_ACTIVE" />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <form
              onSubmit={handleTriggerWebhook}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="inc-id-input">
                  {t('labelIncidentId')}
                </label>
                <input
                  id="inc-id-input"
                  className="form-input mono-metric"
                  value={incidentId}
                  onChange={(e) => setIncidentId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="inc-service-input">
                  {t('labelService')}
                </label>
                <input
                  id="inc-service-input"
                  className="form-input"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="inc-voice-input">
                  {t('labelVoicePostmortem')}
                </label>
                <textarea
                  id="inc-voice-input"
                  className="form-textarea"
                  rows={3}
                  value={voicePostmortem}
                  onChange={(e) => setVoicePostmortem(e.target.value)}
                />
              </div>

              <div>
                <button type="submit" className="btn btn-primary">
                  <Microphone size={16} weight="regular" aria-hidden="true" />
                  <span>{t('btnTriggerWebhook')}</span>
                </button>
              </div>
            </form>

            {/* Recorded Incident History (Flat hairline list, zero nested cards) */}
            <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '16px' }}>
              <div className="small-caps" style={{ marginBottom: '12px' }}>
                Recent Incident Postmortems ({incidents.length})
              </div>
              {loading ? (
                <div className="skeleton" style={{ height: '80px' }} />
              ) : incidents.length === 0 ? (
                <p className="form-helper">No incident webhooks recorded yet.</p>
              ) : (
                <div className="attention-list">
                  {incidents.map((inc) => {
                    const isHighlighted = highlightIncidentId && (inc.id === highlightIncidentId || inc.linked_fence_id === highlightIncidentId);
                    return (
                    <div
                      key={`${inc.id}-${inc.resolved_at}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open details for incident ${inc.id}: ${inc.title}`}
                      className={`attention-row ${isHighlighted ? 'highlighted-row' : ''}`}
                      onClick={() => onSelectIncident && onSelectIncident(inc)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectIncident && onSelectIncident(inc);
                        }
                      }}
                      style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '6px',
                        cursor: onSelectIncident ? 'pointer' : 'default',
                        border: isHighlighted ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                        background: isHighlighted ? 'var(--accent-wash)' : 'var(--bg-surface)',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <span className="mono-metric" style={{ fontWeight: 500 }}>
                          {inc.id} → {inc.linked_fence_id}
                        </span>
                        <span className="form-helper">{inc.source}</span>
                      </div>
                      <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{inc.title}</div>
                      <p className="form-helper" style={{ color: 'var(--ink)' }}>
                        "<FormattedText text={inc.voice_postmortem} />"
                      </p>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Right Column: Branch Checkpoints (Multi-line growing textareas, zero truncated 1-line inputs) */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title">{t('deadEndTitle')}</h2>
            <GitBranch size={18} weight="regular" aria-hidden="true" />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <form
              onSubmit={handleSaveCheckpoint}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="chk-branch-input">
                  Active Git Branch
                </label>
                <input
                  id="chk-branch-input"
                  className="form-input mono-metric"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="chk-deadend-input">
                  {t('labelRuledOut')}
                </label>
                <textarea
                  id="chk-deadend-input"
                  className="form-textarea"
                  rows={3}
                  value={deadEndInput}
                  onChange={(e) => setDeadEndInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="chk-next-input">
                  {t('labelNextAction')}
                </label>
                <textarea
                  id="chk-next-input"
                  className="form-textarea"
                  rows={3}
                  value={nextActionInput}
                  onChange={(e) => setNextActionInput(e.target.value)}
                />
              </div>

              <div>
                <button type="submit" className="btn btn-secondary">
                  <span>{t('btnSaveCheckpoint')}</span>
                </button>
              </div>
            </form>

            {/* Recorded Branch Checkpoints */}
            <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '16px' }}>
              <div className="small-caps" style={{ marginBottom: '12px' }}>
                Saved Branch Checkpoints ({checkpoints.length})
              </div>
              {checkpoints.map((chk) => (
                <div
                  key={chk.id}
                  style={{
                    paddingBottom: '16px',
                    marginBottom: '16px',
                    borderBottom: '1px solid var(--hairline)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mono-metric" style={{ fontWeight: 500 }}>
                      {chk.id} • {chk.branch_name}
                    </span>
                    <span className="form-helper">{chk.author_handle}</span>
                  </div>
                  <p className="body-prose">{chk.summary}</p>
                  <div>
                    <span className="small-caps" style={{ color: 'var(--danger)' }}>
                      {t('labelRuledOut')}
                    </span>
                    <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                      {(chk.ruled_out_dead_ends || []).map((de, i) => (
                        <li key={i} className="form-helper" style={{ color: 'var(--ink)', marginBottom: '4px' }}>
                          <FormattedText text={de} />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="small-caps" style={{ color: 'var(--success)' }}>
                      {t('labelNextAction')}
                    </span>
                    <p className="form-helper" style={{ color: 'var(--ink)', marginTop: '4px' }}>
                      <FormattedText text={chk.next_untested_action} />
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ minHeight: '36px', padding: '0 12px' }}
                      onClick={() => playAudio(chk.audio_url)}
                    >
                      <SpeakerHigh size={16} weight="regular" aria-hidden="true" />
                      <span>{t('btnPlayCheckoutBriefing')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* AI Coding Agent Silent Assumption Ledger + Small Inline Interception Diagram */}
      <article className="card">
        <div className="card-header">
          <div>
            <span className="small-caps">MCP Pre-Commit Guard</span>
            <h2 className="card-title" style={{ marginTop: '4px' }}>
              {t('assumptionLedgerTitle')}
            </h2>
          </div>
          {/* Small inline diagram showing AI-edit interception */}
          <div className="inline-diagram" aria-label="AI edit interception flow">
            <span className="inline-diagram-node">1. AI Agent Diff</span>
            <ArrowRight size={14} weight="regular" aria-hidden="true" />
            <span className="inline-diagram-node">2. whyline-mcp AST Check</span>
            <ArrowRight size={14} weight="regular" aria-hidden="true" />
            <span className="inline-diagram-node">3. Fence Verdict</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>AI Coding Agent &amp; Target File</th>
                <th>Declared Runtime Assumptions</th>
                <th>Spoken Fence Verdict</th>
              </tr>
            </thead>
            <tbody>
              {assumptions.map((asm) => (
                <tr key={asm.id}>
                  <td data-label="ID" className="mono-metric" style={{ fontWeight: 500 }}>
                    {asm.id}
                  </td>
                  <td data-label="Agent & Target">
                    <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{asm.agent_name}</div>
                    <div className="mono-metric" style={{ color: 'var(--ink-muted)', marginTop: '2px' }}>
                      {asm.target_file}
                    </div>
                  </td>
                  <td data-label="Assumptions">
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                      {(asm.declared_assumptions || []).map((item, idx) => (
                        <li key={idx} className="form-helper" style={{ color: 'var(--ink)' }}>
                          <FormattedText text={item} />
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td data-label="Verdict">
                    <StatusBadge status={asm.verdict} />
                    <div className="form-helper" style={{ marginTop: '6px' }}>
                      <span className="mono-metric">{asm.violated_fence_id}:</span>{' '}
                      <FormattedText text={asm.explanation} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {toastMessage && (
        <div className="toast-banner" role="status" aria-live="polite">
          <CheckCircle size={18} weight="fill" aria-hidden="true" style={{ color: 'var(--success)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
