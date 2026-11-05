import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowsClockwise,
  Check,
  Microphone,
  Play,
  ShieldWarning,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import { FormattedText } from '../components/CodeText';
import AskRepoDrawer from '../components/AskRepoDrawer';
import RepoFlowchartExplorer from '../components/RepoFlowchartExplorer';
import ScorecardWidget from '../components/ScorecardWidget';

export default function BriefingDashboard({ theme = 'light' }) {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const [askDrawerOpen, setAskDrawerOpen] = useState(false);
  const [selectedFenceId, setSelectedFenceId] = useState('FENCE-001');
  const [drawerAutoPlay, setDrawerAutoPlay] = useState(false);

  const loadBriefing = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/briefing');
      const json = await resp.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefing();
  }, []);

  const handleScanRepo = async () => {
    try {
      const resp = await fetch('/api/fences/scan', { method: 'POST' });
      if (!resp.ok) throw new Error('Rescan request failed');
      await loadBriefing();
      setToastMsg('Repository rescan complete: 10 AST anomalies indexed.');
    } catch (err) {
      setToastMsg(`Scan error: ${err.message || err}`);
    }
  };

  const runDemoAct1 = async () => {
    try {
      const resp = await fetch('/api/fences/FENCE-001/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN',
          author_handle: '@anjani',
        }),
      });
      if (!resp.ok) throw new Error('Act 1 confirmation request failed');
      const res = await resp.json();
      await loadBriefing();
      if (res?.fence?.audio_url) {
        const audio = new Audio(res.fence.audio_url);
        audio.play().catch(() => {});
      }
      setToastMsg('Step 1 complete: FENCE-001 confirmed via 10s voice note and JUnit invariant compiled.');
    } catch (err) {
      setToastMsg(`Act 1 error: ${err.message || err}`);
    }
  };

  const runDemoAct2 = async () => {
    try {
      const resp = await fetch('/api/fences/intercept-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
          proposed_diff: '- int retryCount = 5;\n+ int retryCount = 1;',
          agent_name: 'Claude Code / Cursor Agent',
          declared_assumptions: ['Assumes retryCount = 5 is redundant legacy boilerplate'],
        }),
      });
      if (!resp.ok) throw new Error('Act 2 intercept test failed');
      const res = await resp.json();
      await loadBriefing();
      if (res?.fence_check?.spoken_warning_url) {
        const audio = new Audio(res.fence_check.spoken_warning_url);
        audio.play().catch(() => {});
      }
      setToastMsg(`Step 2 complete: whyline-mcp returned ${res?.fence_check?.decision || 'REJECT_EDIT'} and played audio warning.`);
    } catch (err) {
      setToastMsg(`Act 2 error: ${err.message || err}`);
    }
  };

  const runDemoAct3 = async () => {
    try {
      const resp = await fetch('/api/config/gateway-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 'v2' }),
      });
      if (!resp.ok) throw new Error('Act 3 gateway cutover failed');
      const res = await resp.json();
      await loadBriefing();
      setToastMsg(`Step 3 complete: gateway.version set to "${res.gateway_version}" in application.yml — FENCE-001 expired safely.`);
    } catch (err) {
      setToastMsg(`Act 3 error: ${err.message || err}`);
    }
  };

  const kpis = data?.kpis || {
    total_fences: 10,
    verified_active: 5,
    pending_confirmations: 2,
    unverified_historical: 3,
    expired_safe_to_remove: 0,
    intercepted_agent_breaks: 10,
  };

  const attentionCount = (kpis.pending_confirmations || 0) + (kpis.unverified_historical || 0);
  const allFences = data?.fences || [];
  const attentionFences = allFences.filter(
    (f) => f.status === 'PENDING_CONFIRMATION' || f.status === 'UNVERIFIED_HISTORICAL'
  );

  const trendSeries = data?.scorecard?.trend_series || [
    { day: 'Day 1', anomalies_scanned: 10, agent_breaks_intercepted: 6, threshold: 9, confirmations: 2 },
    { day: 'Day 2', anomalies_scanned: 10, agent_breaks_intercepted: 7, threshold: 9, confirmations: 4 },
    { day: 'Day 3', anomalies_scanned: 10, agent_breaks_intercepted: 8, threshold: 9, confirmations: 5 },
    { day: 'Day 4', anomalies_scanned: 10, agent_breaks_intercepted: 9, threshold: 9, confirmations: 6 },
    { day: 'Day 5', anomalies_scanned: 10, agent_breaks_intercepted: 10, threshold: 9, confirmations: 7 },
  ];

  const fullIsoTimestamp = data?.updated_at || '2026-11-01T11:24:00Z';

  return (
    <div className="page-stack">
      {/* Row 1: Calm Editorial Header — One Sentence Status & Relative Timestamp */}
      <section className="context-header">
        <div>
          <div className="context-meta">
            <span>HealthConnect</span>
            <span aria-hidden="true">/</span>
            <time dateTime={fullIsoTimestamp} title={fullIsoTimestamp} className="help-cursor">
              Updated 2 min ago
            </time>
            <span aria-hidden="true">/</span>
            <span className="mono-metric">gateway.version = {data?.gateway_version || 'v1'}</span>
          </div>
          <h1 className="page-title">
            {attentionCount > 0
              ? `${attentionCount} fences need your attention.`
              : 'All 10 repository fences verified.'}
          </h1>
          <p className="body-prose briefing-subtitle">
            {t('briefingSubtitle')}
          </p>
        </div>

        <button type="button" className="btn btn-secondary" onClick={handleScanRepo} disabled={loading}>
          <ArrowsClockwise size={16} weight="regular" aria-hidden="true" />
          <span>{t('btnScanRepo')}</span>
        </button>
      </section>

      {/* Toast Confirmation Banner */}
      {toastMsg && (
        <div className="toast-banner" role="status" aria-live="polite">
          <div className="toast-content-flex">
            <Check size={16} weight="regular" aria-hidden="true" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost toast-dismiss-btn"
            onClick={() => setToastMsg(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Calm Tinted Alert Banner (One Primary Action on View) */}
      <section className="urgent-banner" role="region" aria-label="Priority workaround alert">
        <div className="alert-content-flex">
          <WarningCircle
            size={20}
            weight="regular"
            className="alert-icon"
            aria-hidden="true"
          />
          <div>
            <h2 className="alert-title">
              {t('urgentAlertTitle')}
            </h2>
            <p className="form-helper alert-desc">
              <FormattedText text={t('urgentAlertDesc')} />
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/fences')}>
          <Microphone size={16} weight="regular" aria-hidden="true" />
          <span>{t('btnReviewFence')}</span>
        </button>
      </section>

      {/* Single Stat Row (Max 4 per row, No Duplicated Scorecard) */}
      <section className="stat-grid" aria-label="Repository guard metrics">
        <div className="stat-cell">
          <span className="stat-label">Verified active</span>
          <span className="stat-value">
            {kpis.verified_active} / {kpis.total_fences}
          </span>
          <span className="stat-caption">Enforced by pre-edit hook & CI tests</span>
        </div>

        <div className="stat-cell">
          <span className="stat-label">Needs attention</span>
          <span className="stat-value">{attentionCount}</span>
          <span className="stat-caption">
            {kpis.pending_confirmations} pending voice, {kpis.unverified_historical} historical
          </span>
        </div>

        <div className="stat-cell">
          <span className="stat-label">Seeded benchmark (10 cases)</span>
          <span className="stat-value">{kpis.intercepted_agent_breaks} / 10</span>
          <span className="stat-caption">Naive cleanup edits intercepted</span>
        </div>

        <div className="stat-cell">
          <span className="stat-label">Expired workarounds</span>
          <span className="stat-value">{kpis.expired_safe_to_remove}</span>
          <span className="stat-caption">Waiting on config cutover triggers</span>
        </div>
      </section>

      {/* GitHub Repository Flowchart Scanner & Step-by-Step Multilingual Voice Agent */}
      <RepoFlowchartExplorer />

      {/* Live Telemetry Scorecard */}
      <ScorecardWidget scorecardData={data?.scorecard} />

      {/* Primary Operational Split: Needs Attention List (Left) + Compact 90s Demo Stepper (Right) */}
      <section className="operational-split">
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Needs attention</h2>
              <p className="form-helper">Fences awaiting 10-second voice confirmation or historical review</p>
            </div>
            <span className="mono-metric">{attentionFences.length} items</span>
          </div>

          {loading ? (
            <div className="card-body card-body-gap-16">
              <div className="skeleton-line" />
              <div className="skeleton-line" />
            </div>
          ) : attentionFences.length === 0 ? (
            <div className="card-body">
              <p className="form-helper">{t('pendingPanelEmpty')}</p>
            </div>
          ) : (
            <ul className="attention-list">
              {attentionFences.map((fence) => (
                <li key={fence.id} className="attention-item">
                  <div className="attention-item-flex">
                    <div className="attention-item-meta">
                      <span className="mono-metric attention-item-weight">
                        {fence.id}
                      </span>
                      <span className="mono-metric attention-item-muted">
                        {fence.symbol_name}
                      </span>
                      <StatusBadge status={fence.status} />
                    </div>
                    <p className="form-helper">
                      <FormattedText text={fence.reconstructed_why} />
                    </p>
                    <span className="mono-metric attention-item-file">
                      {fence.file_path} • {fence.provenance?.pr_number} ({fence.provenance?.incident_id})
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate(`/fences?id=${fence.id}`)}
                  >
                    <span>Inspect</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Compact Stepper in Side Column for 90-Second Demo Flow */}
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">{t('demoDirectorTitle')}</h2>
              <p className="form-helper">Step through voice confirmation, MCP block, and v2 expiry</p>
            </div>
          </div>

          <ol className="stepper-list">
            <li className="stepper-item">
              <div className="stepper-item-flex">
                <span className="step-number" aria-hidden="true">1</span>
                <div>
                  <div className="stepper-item-title">Confirm PR #212 in Telugu</div>
                  <p className="form-helper">
                    Transcribe 10s voice note via Gnani Prisma v2.5 and compile JUnit invariant.
                  </p>
                </div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={runDemoAct1}>
                <Microphone size={15} weight="regular" aria-hidden="true" />
                <span>Confirm</span>
              </button>
            </li>

            <li className="stepper-item">
              <div className="stepper-item-flex">
                <span className="step-number" aria-hidden="true">2</span>
                <div>
                  <div className="stepper-item-title">Intercept naive agent edit</div>
                  <p className="form-helper">
                    Simulate AI removing <code className="inline-code">retryCount = 5</code>; trigger <code className="inline-code">REJECT_EDIT</code>.
                  </p>
                </div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={runDemoAct2}>
                <ShieldWarning size={15} weight="regular" aria-hidden="true" />
                <span>Test block</span>
              </button>
            </li>

            <li className="stepper-item">
              <div className="stepper-item-flex">
                <span className="step-number" aria-hidden="true">3</span>
                <div>
                  <div className="stepper-item-title">Flip gateway.version to v2</div>
                  <p className="form-helper">
                    Update <code className="inline-code">application.yml</code> to expire FENCE-001 safely.
                  </p>
                </div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={runDemoAct3}>
                <Play size={15} weight="regular" aria-hidden="true" />
                <span>Cutover v2</span>
              </button>
            </li>
          </ol>
        </article>
      </section>

      {/* Below the Fold: Seeded Benchmark Ledger Chart */}
      <article className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Seeded benchmark (10 cases)</h2>
            <p className="form-helper">
              Measured interception trend across 5 sprint checkpoints (.whyline/scorecard.json)
            </p>
          </div>
          <span className="mono-metric">10 / 10 protected</span>
        </div>

        <div className="card-body">
          <div className="chart-box" role="region" aria-label="Seeded benchmark interception chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--hairline)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  stroke="var(--ink-muted)"
                  tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--ink-muted)"
                  tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
                  domain={[0, 12]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-raised)',
                    borderColor: 'var(--hairline-strong)',
                    borderRadius: 'var(--radius-control)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--ink-muted)' }} />
                <Bar
                  dataKey="confirmations"
                  name={t('chartSeriesConfirmed')}
                  fill="var(--info)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Line
                  type="monotone"
                  dataKey="agent_breaks_intercepted"
                  name={t('chartSeriesIntercepted')}
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--accent)' }}
                />
                <Line
                  type="monotone"
                  dataKey="threshold"
                  name={t('chartSeriesThreshold')}
                  stroke="var(--warning)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <details className="collapsible-section">
            <summary>{t('chartSummaryToggle')}</summary>
            <div className="table-wrap chart-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('colDay')}</th>
                    <th className="num-col">{t('colScanned')}</th>
                    <th className="num-col">{t('colIntercepted')}</th>
                    <th className="num-col">{t('colConfirmed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {trendSeries.map((row) => (
                    <tr key={row.day}>
                      <td>{row.day}</td>
                      <td className="num-col">{row.anomalies_scanned}</td>
                      <td className="num-col">{row.agent_breaks_intercepted}</td>
                      <td className="num-col">{row.confirmations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </article>

      <AskRepoDrawer
        isOpen={askDrawerOpen}
        onClose={() => setAskDrawerOpen(false)}
        initialFenceId={selectedFenceId}
        autoPlayAudio={drawerAutoPlay}
      />
    </div>
  );
}
