import React from 'react';
import { useI18n, toBcp47 } from '../i18n';
import ScorecardWidget from '../components/ScorecardWidget';
import StatusBadge from '../components/StatusBadge';
import { ShieldStampIllustration } from '../components/illustrations/FieldIllustrations';

export default function SettingsPage({ repoData, scorecard }) {
  const { lang, t } = useI18n();

  return (
    <div className="page-stack">
      {/* Top Header */}
      <section className="context-header">
        <div>
          <p className="context-meta">{t('settingsContext')}</p>
          <h1 className="page-title">{t('settingsTitle')}</h1>
          <p className="body-prose" style={{ color: 'var(--ink-muted)', marginTop: '6px' }}>
            {t('settingsSubtitle')}
          </p>
        </div>
        <ShieldStampIllustration size={76} />
      </section>

      {/* 3-Column Settings & Provider Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Card 1: Repository & Environment */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '16px' }}>
              01 • {t('settingsRepoCardTitle')}
            </h2>
            <StatusBadge status="VERIFIED_ACTIVE" />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div className="small-caps">{t('settingsRepoPath')}</div>
              <div className="mono-metric" style={{ fontWeight: 600, marginTop: '4px' }}>
                {repoData?.repo_path || 'demo-repos/HealthConnect'}
              </div>
            </div>
            <div>
              <div className="small-caps">{t('settingsFenceStorePath')}</div>
              <div className="mono-metric" style={{ marginTop: '4px', wordBreak: 'break-all' }}>
                demo-repos/HealthConnect/.whyline/assumptions.json
              </div>
            </div>
            <div>
              <div className="small-caps">{t('settingsActiveLanguage')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span className="status-badge status-good">{toBcp47(lang)}</span>
                <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  localStorage['whyline-lang'] = '{lang}'
                </span>
              </div>
            </div>
          </div>
        </article>

        {/* Card 2: Git Pre-Commit & MCP Guard */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '16px' }}>
              02 • {t('settingsGuardCardTitle')}
            </h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-helper" style={{ color: 'var(--ink)' }}>{t('settingsPreCommitHook')}</span>
              <span className="mono-metric">.git/hooks/pre-commit</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-helper" style={{ color: 'var(--ink)' }}>{t('settingsMcpProtocol')}</span>
              <span className="mono-metric">FastMCP check_fences</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-helper" style={{ color: 'var(--ink)' }}>{t('settingsHunkIntersection')}</span>
              <span className="status-badge status-good">@@ -s,l +s,l @@</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-helper" style={{ color: 'var(--ink)' }}>{t('settingsPathSuffixMatch')}</span>
              <span className="status-badge status-good">Path Suffix</span>
            </div>
          </div>
        </article>

        {/* Card 3: Speech, Vector & Compiler Providers */}
        <article className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '16px' }}>
              03 • {t('settingsProvidersCardTitle')}
            </h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-helper" style={{ color: 'var(--ink)' }}>{t('settingsSpeechProvider')}</span>
              <span className="mono-metric">Gnani Vachana STT/TTS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-helper" style={{ color: 'var(--ink)' }}>{t('settingsVectorProvider')}</span>
              <span className="mono-metric">pgvector + MiniLM RRF</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-helper" style={{ color: 'var(--ink)' }}>{t('settingsAstEngine')}</span>
              <span className="mono-metric">Tree-sitter 4-Lang</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-helper" style={{ color: 'var(--ink)' }}>{t('settingsCorsPolicy')}</span>
              <span className="mono-metric">localhost:3000 / 5173</span>
            </div>
          </div>
        </article>
      </section>

      {/* Audit & Security Hardening Verification Table */}
      <article className="card">
        <div className="card-header">
          <h2 className="card-title">{t('settingsSecurityAuditTitle')}</h2>
          <span className="mono-metric">6 / 6 Enforced</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('tableHeaderCategory')}</th>
                <th>{t('tableHeaderRemediation')}</th>
                <th>{t('tableHeaderStatus')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono-metric">VULN-01</td>
                <td>CORS Origin Allowlist</td>
                <td className="mono-metric">Explicit localhost:3000, localhost:5173, 127.0.0.1:5173</td>
                <td><StatusBadge status="VERIFIED_ACTIVE" /></td>
              </tr>
              <tr>
                <td className="mono-metric">VULN-02/03</td>
                <td>Git Branch &amp; Remote Sanitization</td>
                <td className="mono-metric">Regex ^[A-Za-z0-9_./-]+$, blocks leading '-' and ext::</td>
                <td><StatusBadge status="VERIFIED_ACTIVE" /></td>
              </tr>
              <tr>
                <td className="mono-metric">VULN-04</td>
                <td>Workspace Path Containment</td>
                <td className="mono-metric">Blocks '..' traversal outside workspace &amp; demo-repos</td>
                <td><StatusBadge status="VERIFIED_ACTIVE" /></td>
              </tr>
              <tr>
                <td className="mono-metric">VULN-05</td>
                <td>Audio Stem Allowlist</td>
                <td className="mono-metric">Strict allowlist for fence-*, checkpoint_*, flow_*, git_*</td>
                <td><StatusBadge status="VERIFIED_ACTIVE" /></td>
              </tr>
              <tr>
                <td className="mono-metric">DEFECT-3.2/3.3</td>
                <td>MCP Diff Hunk &amp; Path Suffix Match</td>
                <td className="mono-metric">Verifies @@ hunk overlap with [start_line, end_line]</td>
                <td><StatusBadge status="VERIFIED_ACTIVE" /></td>
              </tr>
              <tr>
                <td className="mono-metric">DEFECT-3.4</td>
                <td>AST Anomaly Signature Hash</td>
                <td className="mono-metric">Hashes rel_path:method:anomaly_type:start_line:token</td>
                <td><StatusBadge status="VERIFIED_ACTIVE" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      {/* Live Evaluation Scorecard */}
      <ScorecardWidget scorecard={scorecard} />
    </div>
  );
}
