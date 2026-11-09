import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  GitBranch,
  Lightning,
  LockKey,
  Microphone,
  Moon,
  ShieldCheck,
  Sun,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import { useWorkbenchSelection } from '../context/WorkbenchContext';

const REPO_PRESETS = [
  {
    id: 'demo-repos/HealthConnect',
    label: 'HealthConnect (10 Seeded Fences • PR #212)',
    url: 'https://github.com/HealthConnect/payment-gateway-v1',
    badge: 'Local Demo',
  },
  {
    id: 'expressjs/express',
    label: 'expressjs/express (Node.js REST Router)',
    url: 'https://github.com/expressjs/express',
    badge: 'Node.js',
  },
  {
    id: 'sindresorhus/ky',
    label: 'sindresorhus/ky (TypeScript Fetch Client)',
    url: 'https://github.com/sindresorhus/ky',
    badge: 'TypeScript',
  },
];

export default function LoginPage({ theme = 'light', onToggleTheme }) {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const workbench = useWorkbenchSelection?.() || {};
  const [email, setEmail] = useState('anjani@healthconnect.in');
  const [repo, setRepo] = useState('demo-repos/HealthConnect');
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [emailError, setEmailError] = useState('');
  const [repoError, setRepoError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    let valid = true;

    if (!email.trim() || !email.includes('@')) {
      setEmailError('Enter a valid developer email address (e.g. anjani@healthconnect.in).');
      valid = false;
    } else {
      setEmailError('');
    }

    const effectiveRepo = repo === 'custom' ? customRepoUrl.trim() : repo.trim();
    if (!effectiveRepo) {
      setRepoError('Select or enter a GitHub repository to inspect.');
      valid = false;
    } else {
      setRepoError('');
    }

    if (valid) {
      if (workbench.loadGitHubRepo) {
        const preset = REPO_PRESETS.find((p) => p.id === repo);
        workbench.loadGitHubRepo(preset ? preset.url : effectiveRepo);
      }
      navigate('/');
    }
  };

  const handleInstantDemoLogin = () => {
    setEmail('anjani@healthconnect.in');
    setRepo('demo-repos/HealthConnect');
    setEmailError('');
    setRepoError('');
    if (workbench.loadGitHubRepo) {
      workbench.loadGitHubRepo('https://github.com/HealthConnect/payment-gateway-v1');
    }
    navigate('/');
  };

  return (
    <main className="container" style={{ position: 'relative', zIndex: 1 }}>
      <div className="login-split-layout">
        {/* Left Column: Architectural Provenance Hero Panel with Cartographic Blueprint Art */}
        <section className="login-hero-panel" aria-label="WhyLine Studio Architecture Overview">
          <div className="login-hero-bg-art" aria-hidden="true" />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#545333',
                    color: '#FDFBD4',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '18px',
                    border: '1px solid rgba(253, 251, 212, 0.3)',
                  }}
                >
                  W
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '18px', letterSpacing: '-0.03em', color: '#FDFBD4' }}>
                    WhyLine Studio
                  </div>
                  <div style={{ fontSize: '12px', color: '#D9D7B6' }}>
                    Code Archaeology &amp; Spoken Fence Engine
                  </div>
                </div>
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(84, 83, 51, 0.55)',
                  border: '1px solid rgba(217, 215, 182, 0.35)',
                  fontSize: '12px',
                  color: '#FDFBD4',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <CheckCircle size={14} weight="fill" color="#D9A520" />
                <span>Gnani Timbre v2.5 + Gemini 3.5 Live</span>
              </span>
            </div>

            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(28px, 3.5vw, 42px)',
                  lineHeight: 1.12,
                  color: '#FDFBD4',
                  margin: '0 0 12px 0',
                }}
              >
                Never delete a safety check until you hear why it was written.
              </h2>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#D9D7B6', margin: 0, maxWidth: '56ch' }}>
                WhyLine mines Git blame, pull requests, and spoken developer voice notes to guard critical production lines—explaining any repository with interactive flowcharts, mind maps, and multilingual voice walkthroughs.
              </p>
            </div>

            {/* Embedded Architectural Schematic Illustration */}
            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(20, 20, 9, 0.65)',
                border: '1px solid rgba(217, 215, 182, 0.22)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: '#D9D7B6',
                }}
              >
                <span>LIVE PROVENANCE TELEMETRY • FENCE-001</span>
                <span style={{ color: '#D9A520' }}>VERIFIED_ACTIVE</span>
              </div>
              <svg
                viewBox="0 0 520 110"
                style={{ width: '100%', height: 'auto', display: 'block' }}
                role="img"
                aria-label="Provenance Pipeline Schematic"
              >
                <rect x="8" y="18" width="140" height="72" rx="12" fill="#25251A" stroke="#878672" strokeWidth="1.2" />
                <text x="22" y="44" fill="#FDFBD4" fontSize="11" fontWeight="600" fontFamily="DM Sans, sans-serif">
                  1. Git Blame &amp; PR #212
                </text>
                <text x="22" y="64" fill="#D9D7B6" fontSize="10" fontFamily="DM Mono, monospace">
                  sha: f48a10c (@anjani)
                </text>
                <text x="22" y="80" fill="#D9A520" fontSize="9" fontFamily="DM Mono, monospace">
                  retryCount = 5
                </text>

                <path d="M 148 54 L 188 54" stroke="#D9A520" strokeWidth="1.8" strokeDasharray="4 3" />
                <polygon points="188,50 196,54 188,58" fill="#D9A520" />

                <rect x="196" y="18" width="145" height="72" rx="12" fill="#2F2F22" stroke="#D9A520" strokeWidth="1.5" />
                <text x="210" y="44" fill="#FDFBD4" fontSize="11" fontWeight="600" fontFamily="DM Sans, sans-serif">
                  2. Spoken Fence Lock
                </text>
                <text x="210" y="64" fill="#D9D7B6" fontSize="10" fontFamily="DM Mono, monospace">
                  GatewayRouter.java:23
                </text>
                <text x="210" y="80" fill="#FDFBD4" fontSize="9" fontFamily="DM Mono, monospace">
                  00:00 IST Drop Guard
                </text>

                <path d="M 341 54 L 381 54" stroke="#D9D7B6" strokeWidth="1.8" />
                <polygon points="381,50 389,54 381,58" fill="#D9D7B6" />

                <rect x="389" y="18" width="122" height="72" rx="12" fill="#25251A" stroke="#878672" strokeWidth="1.2" />
                <text x="401" y="44" fill="#FDFBD4" fontSize="11" fontWeight="600" fontFamily="DM Sans, sans-serif">
                  3. Voice &amp; MindMap
                </text>
                <text x="401" y="64" fill="#D9D7B6" fontSize="10" fontFamily="DM Mono, monospace">
                  TE • HI • EN Audio
                </text>
                <text x="401" y="80" fill="#D9A520" fontSize="9" fontFamily="DM Mono, monospace">
                  JUnit Invariant Ready
                </text>
              </svg>
            </div>

            {/* 3 Core Architectural Pillars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div className="login-pillar-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D9A520', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                  <LockKey size={16} weight="duotone" />
                  <span>Spoken Fences</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#D9D7B6', lineHeight: 1.45 }}>
                  Locks critical lines with voice ADRs and auto-generated JUnit regression checks.
                </p>
              </div>

              <div className="login-pillar-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FDFBD4', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                  <GitBranch size={16} weight="duotone" />
                  <span>Full-Screen MindMap</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#D9D7B6', lineHeight: 1.45 }}>
                  Explains any repository’s full stack, why it was chosen, alternatives, and deployment.
                </p>
              </div>

              <div className="login-pillar-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D9A520', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                  <Microphone size={16} weight="duotone" />
                  <span>Indic Voice CoPilot</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#D9D7B6', lineHeight: 1.45 }}>
                  Ask questions in Telugu, Hindi, or English with AST symbol rescoring.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(217, 215, 182, 0.16)',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '12px',
              color: '#D9D7B6',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>WCAG 2.2 AA Verified</span>
            <span>Zero Double-Charge Guarantee</span>
            <span>Offline Sandbox Fallback</span>
          </div>
        </section>

        {/* Right Column: Tactile Authentication Card */}
        <div className="auth-centered" style={{ minHeight: 'auto', display: 'flex', alignItems: 'center' }}>
          <div className="auth-card-container" style={{ width: '100%' }}>
            <div className="auth-offset-slab" aria-hidden="true" />
            <article className="card auth-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Top Brand & Theme Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div className="login-brand">
                    <span className="brand-mark" aria-hidden="true">
                      W
                    </span>
                    <div>
                      <span className="login-brand-name">WhyLine Studio</span>
                      <span className="login-brand-tagline">Spoken Fence &amp; Provenance Ledger</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      className="form-input"
                      style={{ minHeight: '32px', padding: '2px 8px', fontSize: '13px', width: 'auto' }}
                      aria-label={t('langLabel')}
                      value={lang}
                      onChange={(e) => setLang(e.target.value)}
                    >
                      <option value="en">English (EN)</option>
                      <option value="te">తెలుగు (Telugu)</option>
                      <option value="hi">हिंदी (Hindi)</option>
                    </select>

                    {onToggleTheme && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onToggleTheme}
                        aria-label="Toggle color theme"
                      >
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h1 className="auth-headline">{t('loginHeadline')}</h1>
                  <p className="body-prose briefing-subtitle">
                    {t('loginSubtitle')}
                  </p>
                </div>

                {/* Instant 1-Click Demo Access Banner */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--accent-wash)',
                    border: '1px solid var(--border-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Evaluating WhyLine Studio?
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Skip typing and launch with pre-loaded Spoken Fences.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '34px', padding: '0 14px', fontSize: '12px', fontWeight: 600 }}
                    onClick={handleInstantDemoLogin}
                  >
                    <Lightning size={14} weight="fill" />
                    <span>1-Click Demo Login</span>
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="engineer-email">
                      {t('labelEmail')}
                    </label>
                    <input
                      id="engineer-email"
                      type="email"
                      className="form-input mono-metric"
                      value={email}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? 'email-error-msg' : undefined}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError('');
                      }}
                      required
                    />
                    {emailError && (
                      <p id="email-error-msg" className="field-error" role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="target-repo">
                      {t('labelRepoSelect')}
                    </label>
                    <select
                      id="target-repo"
                      className="form-select mono-metric"
                      value={repo}
                      aria-invalid={Boolean(repoError)}
                      aria-describedby={repoError ? 'repo-error-msg' : undefined}
                      onChange={(e) => {
                        setRepo(e.target.value);
                        if (repoError) setRepoError('');
                      }}
                    >
                      {REPO_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                      <option value="custom">Custom GitHub Repository URL...</option>
                    </select>

                    {repo === 'custom' && (
                      <input
                        type="url"
                        className="form-input mono-metric"
                        style={{ marginTop: '8px' }}
                        placeholder="https://github.com/owner/repository"
                        value={customRepoUrl}
                        onChange={(e) => {
                          setCustomRepoUrl(e.target.value);
                          if (repoError) setRepoError('');
                        }}
                      />
                    )}

                    {repoError && (
                      <p id="repo-error-msg" className="field-error" role="alert">
                        {repoError}
                      </p>
                    )}
                  </div>

                  {/* Quick Repo Selection Pills */}
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Quick switch workspace:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {REPO_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`btn ${repo === preset.id ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ minHeight: '28px', padding: '0 10px', fontSize: '11px' }}
                          onClick={() => {
                            setRepo(preset.id);
                            setRepoError('');
                          }}
                        >
                          <span className="mono-metric">{preset.id.split('/').pop()}</span>
                          <span style={{ opacity: 0.75 }}>({preset.badge})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary login-form-btn" style={{ marginTop: '4px' }}>
                    <ShieldCheck size={18} weight="regular" aria-hidden="true" />
                    <span>{t('btnEnterStudio')}</span>
                    <ArrowRight size={16} weight="regular" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </article>
          </div>
        </div>
      </div>
    </main>
  );
}
