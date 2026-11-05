import React, { useState } from 'react';
import { useI18n } from '../i18n';

/**
 * /dev/typography — Dev-only route showing the type scale and test strings per script.
 * Verifies: no clipped matras/top bars, no tofu, correct mixed-script spacing,
 * script-aware line-heights, and Indic face compensation.
 */
export default function TypographyPage() {
  const { lang, setLang, t } = useI18n();
  const [showAllScripts, setShowAllScripts] = useState(false);

  const testStrings = {
    en: [
      'GatewayRouter retryCount = 5 must stay until the v2 cutover.',
      'PR #212 — Confirm FENCE-001 via 10s voice note.',
      'AST Anomaly Detection: MAGIC_LITERAL_CONTROL_FLOW',
    ],
    hi: [
      'गेटवे राउटर में retryCount 5 ही रखें, v2 कटओवर तक।',
      'क्षत्रिय श्रद्धा ज्ञान द्वारा उद्योग',
      'रिट्राई काउंट 5 को v2 कटओवर तक बनाए रखें।',
    ],
    te: [
      'గేట్‌వేరౌటర్_INCLUDE retryCount 5_alagu_ v2_katt_overy_with_out_dot.',
      'స్వాతంత్ర్యం_lakshmi_krishna_samskruti',
      'రిట్రై కౌంట్ 5ను v2 కటోవర్ వరకు ఉంచండి.',
    ],
  };

  const scriptLabels = {
    en: 'English (Latin)',
    hi: 'हिंदी (Devanagari)',
    te: 'తెలుగు (Telugu)',
  };

  const typeScale = [
    { name: 'h1 / .page-title', className: 'page-title', text: 'Page Title (44px / 1.10)' },
    { name: 'h2 / .section-title', className: 'section-title', text: 'Section Title (28px / 1.21)' },
    { name: 'h3 / .card-title', className: 'card-title', text: 'Card Title (16px / 1.50)' },
    { name: 'body', className: '', text: 'Body text — 16px / 26px, leading per script' },
    { name: 'lead-status', className: 'lead-status', text: 'Lead Status (20px / 1.40)' },
    { name: 'kpi-value', className: 'kpi-value', text: 'KPI Value — 28px mono, tabular-nums' },
    { name: 'form-label', className: 'form-label', text: 'Form Label (12px / 1.33)' },
    { name: 'caption', className: '', text: 'Caption text — >= 18px, te line-height 1.9' },
  ];

  const activeScript = showAllScripts ? null : lang;

  return (
    <div className="page-stack">
      <section className="context-header">
        <div>
          <p className="context-meta">Dev Tool • Typography Verification</p>
          <h1 className="page-title">Type Scale & Script Test</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${showAllScripts ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowAllScripts(true)}
          >
            All Scripts
          </button>
          {['en', 'hi', 'te'].map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-secondary ${activeScript === s ? 'btn-primary' : ''}`}
              onClick={() => setShowAllScripts(false) || setLang(s)}
            >
              {scriptLabels[s]}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const el = document.documentElement;
              const val = el.getAttribute('data-pseudo-locale') === 'true' ? null : 'true';
              if (val) el.setAttribute('data-pseudo-locale', 'true');
              else el.removeAttribute('data-pseudo-locale');
            }}
          >
            Pseudo-Locale (~40% padding)
          </button>
        </div>
      </section>

      {/* Type Scale */}
      <article className="card card-padded-lg">
        <div className="card-header">
          <h2 className="card-title">Type Scale</h2>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: '24px' }}>
          {typeScale.map((item) => (
            <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="form-label">{item.name}</span>
              <div className={item.className} style={{ overflowWrap: 'break-word' }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </article>

      {/* Script Test Strings */}
      <article className="card card-padded-lg">
        <div className="card-header">
          <h2 className="card-title">Script Test Strings</h2>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: '32px' }}>
          {(['en', 'hi', 'te']).map((script) => (
            <section key={script} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span className="form-label">{scriptLabels[script]}</span>
                <span className="status-badge status-muted">
                  :lang({script})
                </span>
              </div>
              {testStrings[script].map((str, i) => (
                <p key={i} className="paragraph" style={{ overflowWrap: 'break-word' }}>
                  {str}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>

      {/* Line-height Comparison */}
      <article className="card card-padded-lg">
        <div className="card-header">
          <h2 className="card-title">Script-Aware Line-Height Comparison</h2>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: '24px' }}>
          {(['en', 'hi', 'te']).map((script) => (
            <section key={script} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="form-label">{scriptLabels[script]}</span>
                <span className="status-badge status-muted">
                  body line-height: {script === 'en' ? '1.55' : script === 'hi' ? '1.7' : '1.8'}
                </span>
              </div>
              <div className="paragraph" style={{ overflowWrap: 'break-word', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>
                {'The quick brown fox jumps over the lazy dog. retryCount = 5 must stay until the v2 cutover.'}
              </div>
            </section>
          ))}
        </div>
      </article>

      {/* Design Tokens Reference */}
      <article className="card card-padded-lg">
        <div className="card-header">
          <h2 className="card-title">Design Tokens (tokens.css)</h2>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: '16px' }}>
          <div className="form-helper">
            <strong>Font stacks:</strong><br />
            --font-sans: DM Sans, Noto Sans Devanagari, Noto Sans Telugu, system-ui<br />
            --font-display: Crimson Text, Noto Serif Devanagari, Noto Serif Telugu, Georgia<br />
            --font-mono: DM Mono, Noto Sans Devanagari, Noto Sans Telugu, ui-monospace
          </div>
          <div className="form-helper">
            <strong>Weights:</strong> 400 / 500 / 600 only<br />
            <strong>font-synthesis:</strong> none (no faux italic/bold)<br />
            <strong>text-transform:</strong> none on hi/te<br />
            <strong>letter-spacing:</strong> 0 on hi/te
          </div>
          <div className="form-helper">
            <strong>Body line-height:</strong> en 1.55, hi 1.7, te 1.8<br />
            <strong>Heading line-height:</strong> en 1.15, hi 1.35, te 1.45<br />
            <strong>Caption line-height:</strong> 1.9 (te)
          </div>
          <div className="form-helper">
            <strong>Indic face compensation:</strong> size-adjust 106%<br />
            <strong>unicode-range Devanagari:</strong> U+0900-097F U+200C-200D U+A8E0-A8FF<br />
            <strong>unicode-range Telugu:</strong> U+0C00-0C7F U+200C-200D<br />
            <strong>font-display:</strong> swap
          </div>
        </div>
      </article>
    </div>
  );
}

TypographyPage.displayName = 'TypographyPage';
