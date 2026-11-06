import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowUp,
  ChatCircleText,
  CheckCircle,
  Code,
  ClockCounterClockwise,
  FileText,
  GearSix,
  House,
  Moon,
  ShieldCheck,
  Sun,
  WarningDiamond,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';

/**
 * Site Footer with Frosted Glass L2 & 3D Raised-Cap Controls
 */
export default function Footer({ theme, onToggleTheme, onOpenAskDrawer }) {
  const { lang, setLang, t, voiceModel } = useI18n();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className="site-footer glass-navbar"
      style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-default)',
        background: 'var(--surface-glass, rgba(255, 254, 240, 0.85))',
        padding: '32px 0 24px 0',
      }}
      aria-label="Site footer and status hub"
    >
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Top Tier: Brand, Telemetry & Navigation Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Col 1: Brand & Provenance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/logo.svg"
                alt="WhyLine Speaking Fence"
                width={26}
                height={26}
                style={{ borderRadius: '6px' }}
              />
              <span className="brand-wordmark" style={{ fontSize: '18px' }}>
                Why<span className="brand-wordmark-accent">Line</span> Studio
              </span>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: '20px',
                maxWidth: '38ch',
              }}
            >
              Guard the unwritten "why" behind code. AST anomaly detection, multilingual spoken ADRs, and MCP pre-commit interception.
            </p>
            <div className="chip-row" style={{ marginTop: '4px' }}>
              <span className="status-badge status-good" style={{ fontSize: '11px', padding: '2px 8px' }}>
                <CheckCircle size={14} weight="fill" aria-hidden="true" />
                <span>HealthConnect Repo • Protected</span>
              </span>
            </div>
          </div>

          {/* Col 2: Core Workspaces & Routes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Studio Workspaces
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <NavLink to="/" className="btn btn-secondary" style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px' }}>
                <House size={14} />
                <span>{t('navHome')}</span>
              </NavLink>
              <NavLink to="/studio" className="btn btn-secondary" style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px' }}>
                <Code size={14} />
                <span>{t('navWorkbench')}</span>
              </NavLink>
              <NavLink to="/memory" className="btn btn-secondary" style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px' }}>
                <ClockCounterClockwise size={14} />
                <span>{t('navMemory')}</span>
              </NavLink>
              <NavLink to="/settings" className="btn btn-secondary" style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px' }}>
                <GearSix size={14} />
                <span>{t('navSettings')}</span>
              </NavLink>
            </div>
          </div>

          {/* Col 3: Engine Telemetry & Quick Action Dock */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Live Telemetry &amp; Access Dock
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ minHeight: '36px', padding: '0 14px', fontSize: '13px' }}
                onClick={onOpenAskDrawer}
                aria-label="Open Ask Repo Co-Pilot drawer"
              >
                <ChatCircleText size={16} weight="regular" />
                <span>Ask Repo</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px' }}
                onClick={onToggleTheme}
                aria-label="Toggle light or dark appearance"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <span>{theme === 'dark' ? 'Paper Light' : 'Khaki Dark'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                style={{ minHeight: '36px', minWidth: '36px', padding: '0 10px' }}
                onClick={scrollToTop}
                aria-label="Scroll back to top of page"
                title="Back to Top"
              >
                <ArrowUp size={16} weight="regular" />
              </button>
            </div>

            {/* Language Switcher Pills + Linked Voice Model Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Language:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {[
                  { code: 'en', label: 'English', voice: 'Pranav' },
                  { code: 'te', label: 'తెలుగు', voice: 'Nalini' },
                  { code: 'hi', label: 'हिंदी', voice: 'Bhavna' },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    lang={item.code}
                    className={`filter-chip ${lang === item.code ? 'active' : ''}`}
                    style={{
                      minHeight: '26px',
                      padding: '0 10px',
                      fontSize: '12px',
                      lineHeight: '24px',
                    }}
                    onClick={() => setLang(item.code)}
                    title={`Switch language to ${item.label} and voice model to ${item.voice}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {voiceModel && (
                <span
                  className="status-badge status-good"
                  style={{ fontSize: '11px', padding: '1px 8px', minHeight: '22px' }}
                  title="Synchronized Gnani Timbre Neural Voice Model"
                >
                  Voice: {voiceModel.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Architectural Invariants */}
        <div
          style={{
            paddingTop: '16px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            WhyLine Studio • Cream-and-Olive Architectural Field-Report System • WCAG 2.2 AA
          </div>
          <div className="mono-metric" style={{ fontSize: '11px' }}>
            Version 1.0.0 • AST SHA: <span style={{ color: 'var(--text-primary)' }}>97959517</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
