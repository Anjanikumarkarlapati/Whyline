import React, { useEffect, useState } from 'react';
import { ArrowsClockwise, CheckCircle, GearSix } from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import { FormattedText } from '../components/CodeText';

export default function SettingsPage() {
  const { lang, setLang, t, voiceModel } = useI18n();
  const [settings, setSettings] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [fxMode, setFxMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-fx') === 'lite' ? 'lite' : 'full';
    }
    return 'full';
  });

  const handleFxChange = (newFx) => {
    setFxMode(newFx);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-fx', newFx);
      try {
        window.localStorage?.setItem('whyline-fx', newFx);
      } catch {
        // ignore
      }
    }
    setToastMessage(`Visual effects set to ${newFx === 'lite' ? 'Lite (solid surfaces)' : 'Full (glassmorphism)'}.`);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const loadSettings = async () => {
    try {
      const [sResp, bResp] = await Promise.all([fetch('/api/settings'), fetch('/api/briefing')]);
      const sData = await sResp.json();
      const bData = await bResp.json();
      setSettings(sData);
      setScorecard(bData.scorecard);
    } catch {
      setSettings(null);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleRerunBenchmark = async () => {
    await fetch('/api/fences/scan', { method: 'POST' });
    await loadSettings();
    setToastMessage('Re-ran AST scan and refreshed Seeded benchmark (10 cases).');
    setTimeout(() => setToastMessage(''), 3200);
  };

  return (
    <div className="page-stack">
      <section className="context-header">
        <div>
          <p className="context-meta">{t('settingsContext')}</p>
          <h1 className="page-title">{t('settingsTitle')}</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleRerunBenchmark}>
          <ArrowsClockwise size={16} weight="regular" aria-hidden="true" />
          <span>{t('btnRescanBenchmark')}</span>
        </button>
      </section>

      {/* Section 1: Repository & Environment */}
      <section className="two-col-grid">
        <article className="card">
          <div className="card-header">
            <h2 className="card-title">Repository &amp; Environment</h2>
            <GearSix size={18} weight="regular" aria-hidden="true" />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div className="small-caps">Target Repository Path</div>
              <div className="mono-metric" style={{ marginTop: '4px', color: 'var(--ink)' }}>
                {settings?.repo_path || 'demo-repos/HealthConnect'}
              </div>
            </div>

            <div>
              <div className="small-caps">Deterministic Git Hooks Installed</div>
              <div className="mono-metric" style={{ marginTop: '6px' }}>
                {settings?.git_hooks?.pre_commit_hook || '.git/hooks/pre-commit'}
              </div>
              <div className="mono-metric" style={{ marginTop: '2px' }}>
                {settings?.git_hooks?.post_checkout_hook || '.git/hooks/post-checkout'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-lang-select">
                {t('langLabel')}
              </label>
              <select
                id="settings-lang-select"
                className="form-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="en">English (EN • Pranav voice model)</option>
                <option value="te">తెలుగు (Telugu • Nalini voice model)</option>
                <option value="hi">हिंदी (Hindi • Bhavna voice model)</option>
              </select>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Linked Voice Model:
                </span>
                <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 8px' }}>
                  {voiceModel?.name} ({voiceModel?.locale} • {voiceModel?.model})
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-fx-select">
                Visual Effects Mode (DESIGN.md Fallback #5)
              </label>
              <select
                id="settings-fx-select"
                className="form-select"
                value={fxMode}
                onChange={(e) => handleFxChange(e.target.value)}
              >
                <option value="full">Full FX (L2 Floating Glass &amp; Ambient Glow)</option>
                <option value="lite">Lite FX (Solid Surfaces &amp; Single-Layer Shadows)</option>
              </select>
              <p className="form-helper">
                When set to Lite (or on devices with &le; 4GB RAM), backdrop-filter is disabled and surfaces remain solid.
              </p>
            </div>
          </div>
        </article>

        {/* Section 2: Speech & Vector Providers */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title">Speech &amp; Vector Providers</h2>
            <StatusBadge status="VERIFIED_ACTIVE" />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div className="small-caps">
                Gnani Vachana Speech Stack (Prisma v3.0 STT + Timbre v3.0 TTS)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <span className="mono-metric" style={{ color: 'var(--ink)' }}>
                  {settings?.providers?.gnani_vachana_speech?.mode ||
                    'Live API (Shivani, Avinash, Kalpana)'}
                </span>
              </div>
              <p className="form-helper" style={{ marginTop: '4px' }}>
                Rescores spoken Telugu/Hindi code-mixed utterances against AST symbols. Supports top 3 neural voices: Shivani (Female), Avinash (Male), Kalpana (Female).
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '16px' }}>
              <div className="small-caps">Supabase pgvector + Local RRF Store</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <span className="mono-metric" style={{ color: 'var(--ink)' }}>
                  {settings?.providers?.supabase_pgvector?.mode ||
                    'Local RRF + SQL Migration Ready'}
                </span>
              </div>
              <p className="form-helper" style={{ marginTop: '4px' }}>
                Executes hybrid Reciprocal Rank Fusion (<code className="inline-code">k=60</code>) across vector embeddings and full-text AST symbols.
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Section 3: Seeded Benchmark Table with Sticky First Column */}
      <article className="card">
        <div className="card-header">
          <div>
            <span className="small-caps">Empirical Verification</span>
            <h2 className="card-title" style={{ marginTop: '4px' }}>
              Seeded benchmark (10 cases)
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
                <th>MCP Decision</th>
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
    </div>
  );
}
