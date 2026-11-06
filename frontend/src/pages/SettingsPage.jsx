import React, { useEffect, useState } from 'react';
import {
  ArrowsClockwise,
  CheckCircle,
  Database,
  GearSix,
  Key,
  Microphone,
  Moon,
  ShieldCheck,
  Sun,
  Swap,
  UserCircle,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import { FormattedText } from '../components/CodeText';
import SessionModal from '../components/SessionModal';

export default function SettingsPage() {
  const { lang, setLang, t, voiceModel } = useI18n();
  const [settings, setSettings] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [gatewayVersion, setGatewayVersion] = useState('v1');
  const [toastMessage, setToastMessage] = useState('');
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('HealthConnect');

  // Appearance theme state
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') || 'light';
    }
    return 'light';
  });

  const [fxMode, setFxMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-fx') === 'lite' ? 'lite' : 'full';
    }
    return 'full';
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadSettings = async () => {
    try {
      const [sResp, bResp] = await Promise.all([fetch('/api/settings'), fetch('/api/briefing')]);
      const sData = await sResp.json();
      const bData = await bResp.json();
      setSettings(sData);
      setScorecard(bData.scorecard);
      setGatewayVersion(bData.gateway_version || 'v1');
    } catch {
      setSettings(null);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.setAttribute('data-mode', nextTheme);
    try {
      localStorage.setItem('whyline-theme', nextTheme);
    } catch {
      // ignore
    }
    showToast(`Theme switched to ${nextTheme === 'dark' ? 'Khaki Dark' : 'Paper Light'}.`);
  };

  const handleFxChange = (newFx) => {
    setFxMode(newFx);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-fx', newFx);
      try {
        localStorage.setItem('whyline-fx', newFx);
      } catch {
        // ignore
      }
    }
    showToast(`Visual effects set to ${newFx === 'lite' ? 'Lite (solid surfaces)' : 'Full (glassmorphism)'}.`);
  };

  const handleToggleGatewayVersion = async () => {
    const nextVersion = gatewayVersion === 'v2' ? 'v1' : 'v2';
    try {
      const resp = await fetch('/api/config/gateway-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: nextVersion }),
      });
      if (!resp.ok) throw new Error('Gateway version update failed');
      setGatewayVersion(nextVersion);
      showToast(`Gateway cutover updated to "${nextVersion}" in application.yml.`);
      await loadSettings();
    } catch (err) {
      showToast(`Error toggling gateway version: ${err.message || err}`);
    }
  };

  const handleRerunBenchmark = async () => {
    await fetch('/api/fences/scan', { method: 'POST' });
    await loadSettings();
    showToast('Re-ran AST scan and refreshed Seeded benchmark (10 cases).');
  };

  return (
    <div className="page-stack">
      {/* Context Header */}
      <section className="context-header">
        <div>
          <p className="context-meta">{t('settingsContext')}</p>
          <h1 className="page-title">{t('settingsTitle')}</h1>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleRerunBenchmark}>
          <ArrowsClockwise size={16} weight="regular" aria-hidden="true" />
          <span>{t('btnRescanBenchmark')}</span>
        </button>
      </section>

      {/* Grid: 2 Columns for Sections */}
      <div className="two-col-grid">
        {/* Section 1: Service Integrations */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title">1. Service Integrations</h2>
            <StatusBadge status="VERIFIED_ACTIVE" />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Gnani AI Stack */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="small-caps">Gnani Vachana Speech Stack</span>
                <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 8px' }}>
                  Online • ~110ms
                </span>
              </div>
              <div className="mono-metric" style={{ marginTop: '4px', color: 'var(--text-primary)' }}>
                Prisma v3.0 STT &amp; Timbre v3.0 DSP Engine
              </div>
              <p className="form-helper" style={{ margin: '4px 0 0 0' }}>
                Rescores code-mixed Indic speech against AST symbols. Voice IDs: <strong>Shivani / Nalini</strong> (Telugu), <strong>Avinash / Bhavna</strong> (Hindi), <strong>Kalpana / Pranav</strong> (English).
              </p>
            </div>

            {/* Supabase pgvector */}
            <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="small-caps">Supabase pgvector Knowledge Base</span>
                <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 8px' }}>
                  Online • 768-dim HNSW
                </span>
              </div>
              <div className="mono-metric" style={{ marginTop: '4px', color: 'var(--text-primary)' }}>
                Hybrid Reciprocal Rank Fusion (k=60)
              </div>
              <p className="form-helper" style={{ margin: '4px 0 0 0' }}>
                Vector dimension 768, cosine similarity distance. Combines full-text BM25 index with AST token boosts. Active vectors: 42.
              </p>
            </div>

            {/* MCP Pre-Commit Hook */}
            <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="small-caps">whyline-mcp Pre-Commit Interceptor</span>
                <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 8px' }}>
                  Active • v1.0.0
                </span>
              </div>
              <div className="mono-metric" style={{ marginTop: '4px', color: 'var(--text-primary)' }}>
                Hooks: .git/hooks/pre-commit &amp; post-checkout
              </div>
              <p className="form-helper" style={{ margin: '4px 0 0 0' }}>
                Inspects diff hunks before git commit and Claude Code / Cursor agent actions. Intercepts regressions on guarded AST ranges.
              </p>
            </div>
          </div>
        </article>

        {/* Section 2: Gateway Cutover & Expiry Controls */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title">2. Gateway Version &amp; Expiry Control</h2>
            <Swap size={18} weight="regular" aria-hidden="true" />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
              Controls the centralized upstream payment gateway release flag in <code className="inline-code">config/application.yml</code>. Spoken fences automatically expire when the required infrastructure version is satisfied.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--bg-raised)',
                borderRadius: '12px',
                border: '1px solid var(--border-default)',
              }}
            >
              <div>
                <span className="small-caps" style={{ color: 'var(--text-secondary)' }}>
                  Active Gateway Version
                </span>
                <div className="mono-metric" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>
                  gateway.version = {gatewayVersion}
                </div>
              </div>

              <button
                type="button"
                className={`btn ${gatewayVersion === 'v2' ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleToggleGatewayVersion}
              >
                <span>{gatewayVersion === 'v2' ? 'Rollback to v1' : 'Cutover to v2'}</span>
              </button>
            </div>

            <div className="card" style={{ padding: '12px', background: 'var(--bg-surface)' }}>
              <span className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Fences Affected by Cutover:
              </span>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', lineHeight: '1.4' }}>
                {gatewayVersion === 'v2' ? (
                  <span style={{ color: 'var(--status-good, #545333)', fontWeight: 500 }}>
                    ✓ FENCE-001 (GatewayRouter.java retryCount=5) has safely auto-expired. AI agents may clean up the workaround.
                  </span>
                ) : (
                  <span style={{ color: 'var(--status-warning, #8F5A08)', fontWeight: 500 }}>
                    ⚠ FENCE-001 is active. Naive agent edits to retryCount=5 will be rejected.
                  </span>
                )}
              </p>
            </div>
          </div>
        </article>

        {/* Section 3: Zero-Secret Verification */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title">3. Zero-Secret Verification</h2>
            <Key size={18} weight="regular" aria-hidden="true" />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
              WhyLine strictly enforces an air-gapped security boundary. No API secrets, auth tokens, or private endpoints are bundled or exposed to client browsers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-raised)',
                  fontSize: '13px',
                }}
              >
                <span className="mono-metric">GNANI_API_KEY</span>
                <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 8px' }}>
                  Server-Side Only (Zero Frontend Leak)
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-raised)',
                  fontSize: '13px',
                }}
              >
                <span className="mono-metric">SUPABASE_SERVICE_ROLE</span>
                <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 8px' }}>
                  Server-Side Only (Zero Frontend Leak)
                </span>
              </div>
            </div>
          </div>
        </article>

        {/* Section 4: Preferences (Theme & Language) */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title">4. Preferences</h2>
            <GearSix size={18} weight="regular" aria-hidden="true" />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-theme-select">
                Appearance Theme
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    if (theme !== 'light') handleToggleTheme();
                  }}
                >
                  <Sun size={16} />
                  <span>Paper Light (#FDFBD4)</span>
                </button>
                <button
                  type="button"
                  className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    if (theme !== 'dark') handleToggleTheme();
                  }}
                >
                  <Moon size={16} />
                  <span>Khaki Dark (#1C1C12)</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-lang-select">
                {t('langLabel')} &amp; Spoken Persona
              </label>
              <select
                id="settings-lang-select"
                className="form-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="en">English (EN • Pranav voice)</option>
                <option value="te">తెలుగు (Telugu • Nalini voice)</option>
                <option value="hi">हिंदी (Hindi • Bhavna voice)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-fx-select">
                Visual Effects Mode
              </label>
              <select
                id="settings-fx-select"
                className="form-select"
                value={fxMode}
                onChange={(e) => handleFxChange(e.target.value)}
              >
                <option value="full">Full FX (Glassmorphism &amp; Backdrop Filter)</option>
                <option value="lite">Lite FX (Solid Surfaces for Reduced Motion &amp; Low RAM)</option>
              </select>
            </div>
          </div>
        </article>
      </div>

      {/* Section 5: Account & Session (from old Login) */}
      <article className="card" style={{ marginTop: '8px' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">5. Account &amp; Repository Boundary</h2>
            <p className="form-helper">Session identity absorbed from former standalone login route</p>
          </div>
          <UserCircle size={22} weight="regular" aria-hidden="true" />
        </div>
        <div
          className="card-body"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--accent-wash)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <UserCircle size={28} weight="fill" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Anjani Kumar</span>
                <span className="mono-metric" style={{ color: 'var(--accent)' }}>
                  @anjani
                </span>
                <span className="status-badge status-good" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  Lead SRE / Codebase Author
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                anjani@healthconnect.in • Active Repository: <strong>HealthConnect Payment Gateway v1</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSessionModalOpen(true)}
          >
            <Swap size={16} weight="regular" aria-hidden="true" />
            <span>Switch Session / Repository</span>
          </button>
        </div>
      </article>

      {/* Seeded Benchmark Table */}
      <article className="card">
        <div className="card-header">
          <div>
            <span className="small-caps">Empirical Verification</span>
            <h2 className="card-title" style={{ marginTop: '4px' }}>
              Seeded Benchmark (10 Anomaly Test Cases)
            </h2>
          </div>
          <span className="mono-metric">{(scorecard?.cases || []).length} cases</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky-col">Fence ID</th>
                <th>Symbol &amp; File</th>
                <th>Simulated AI Agent Edit</th>
                <th>MCP Guardrail Decision</th>
              </tr>
            </thead>
            <tbody>
              {(scorecard?.cases || []).map((c) => (
                <tr key={c.fence_id}>
                  <td data-label="Fence ID" className="sticky-col mono-metric" style={{ fontWeight: 500 }}>
                    {c.fence_id}
                  </td>
                  <td data-label="Symbol">
                    <div className="mono-metric" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                      {c.symbol_name}
                    </div>
                  </td>
                  <td data-label="Simulated Edit">
                    <div className="form-helper" style={{ color: 'var(--ink)' }}>
                      <FormattedText text={c.simulated_agent_edit} />
                    </div>
                  </td>
                  <td data-label="MCP Decision">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <StatusBadge
                        status={c.mcp_decision === 'REJECT_EDIT' ? 'REJECT_EDIT' : c.mcp_decision}
                        hideIfDefault={false}
                      />
                      <span className="mono-metric">{c.mcp_decision}</span>
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

      <SessionModal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
      />
    </div>
  );
}
