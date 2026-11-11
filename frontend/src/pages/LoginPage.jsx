import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  CircleNotch,
  GitBranch,
  Lightning,
  LockKey,
  Microphone,
  Moon,
  Sun,
  WarningOctagon,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import { useWorkbenchSelection } from '../context/WorkbenchContext';

const REPO_PRESETS = [
  { url: 'https://github.com/HealthConnect/payment-gateway-v1', name: 'payment-gateway-v1', badge: 'Local demo · 10 fences' },
  { url: 'https://github.com/expressjs/express', name: 'express', badge: 'Node.js' },
  { url: 'https://github.com/sindresorhus/ky', name: 'ky', badge: 'TypeScript' },
];

const LOAD_STEPS = ['Fetching file tree', 'Mapping blame & PRs', 'Indexing for questions'];
const GITHUB_RE = /^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Normalise "owner/repo" or a GitHub URL; returns null when it isn't one. */
function toRepoUrl(input) {
  const m = input.trim().match(GITHUB_RE);
  return m ? `https://github.com/${m[1]}/${m[2]}` : null;
}

export default function LoginPage({ theme = 'light', onToggleTheme }) {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const { loadGitHubRepo } = useWorkbenchSelection?.() || {};
  const [repo, setRepo] = useState(REPO_PRESETS[0].url);
  const [error, setError] = useState('');
  const [step, setStep] = useState(-1); // -1 idle, 0..n-1 running, n done
  const inputRef = useRef(null);
  const busy = step >= 0;

  // Generator-style choreography: steps advance on a timeline while the real load runs in parallel.
  const enter = async (rawRepo) => {
    const url = toRepoUrl(rawRepo);
    if (!url) {
      setError('Enter a GitHub link or owner/repo, e.g. expressjs/express.');
      inputRef.current?.focus();
      return;
    }
    setError('');
    setRepo(url);
    setStep(0);
    const load = loadGitHubRepo ? loadGitHubRepo(url) : Promise.resolve(true);
    for (let i = 1; i < LOAD_STEPS.length; i += 1) {
      await sleep(650);
      setStep(i);
    }
    const ok = await load;
    if (!ok) {
      setStep(-1);
      setError('Could not load that repository. Check the link is public and try again.');
      return;
    }
    setStep(LOAD_STEPS.length);
    await sleep(450);
    navigate('/');
  };

  return (
    <main className="login-stage" data-busy={busy}>
      <div className="login-split-layout">
        <section className="login-hero-panel" aria-label="WhyLine Studio overview">
          <div className="login-hero-bg-art" aria-hidden="true" />
          <div className="login-hero-body">
            <div className="login-brand login-reveal" style={{ '--i': 0 }}>
              <span className="login-hero-mark" aria-hidden="true">W</span>
              <div>
                <div className="login-hero-name">WhyLine Studio</div>
                <div className="login-hero-tag">Code archaeology &amp; spoken fences</div>
              </div>
            </div>

            <div className="login-reveal" style={{ '--i': 1 }}>
              <h2 className="login-hero-title">Never delete a safety check until you hear why it was written.</h2>
              <p className="login-hero-copy">
                Drop in any GitHub repository. WhyLine mines blame, pull requests and spoken developer notes, then answers
                your questions in English, Hindi or Telugu.
              </p>
            </div>

            <div className="login-reveal login-schematic" style={{ '--i': 2 }}>
              <svg viewBox="0 0 520 90" role="img" aria-label="Pipeline: repository, spoken fence, voice answer">
                <g className="schematic-node">
                  <rect x="8" y="12" width="140" height="66" rx="12" />
                  <text x="22" y="40" className="s-title">1. Repository</text>
                  <text x="22" y="60" className="s-mono">blame · PR #212</text>
                </g>
                <path className="schematic-wire" d="M148 45 H196" pathLength="1" />
                <g className="schematic-node is-hot">
                  <rect x="196" y="12" width="145" height="66" rx="12" />
                  <text x="210" y="40" className="s-title">2. Spoken fence</text>
                  <text x="210" y="60" className="s-mono">GatewayRouter:23</text>
                </g>
                <path className="schematic-wire w2" d="M341 45 H389" pathLength="1" />
                <g className="schematic-node">
                  <rect x="389" y="12" width="122" height="66" rx="12" />
                  <text x="401" y="40" className="s-title">3. Voice answer</text>
                  <text x="401" y="60" className="s-mono">TE · HI · EN</text>
                </g>
              </svg>
            </div>

            <ul className="login-pillars">
              {[
                [LockKey, 'Spoken Fences', 'Lock critical lines with voice ADRs and regression checks.'],
                [GitBranch, 'Repo MindMap', 'See the stack, why it was chosen, and how it deploys.'],
                [Microphone, 'Indic Voice', 'Ask in Telugu, Hindi or English by voice or text.'],
              ].map(([Icon, title, copy], i) => (
                <li key={title} className="login-pillar-card login-reveal" style={{ '--i': 3 + i }}>
                  <div className="login-pillar-title"><Icon size={16} weight="duotone" aria-hidden="true" /> {title}</div>
                  <p>{copy}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="auth-centered">
          <div className="auth-card-container">
            <div className="auth-offset-slab" aria-hidden="true" />
            <article className="card auth-card login-reveal" style={{ '--i': 1 }}>
              <div className="login-card-head">
                <span className="login-brand-name">Open a repository</span>
                <div className="login-card-tools">
                  <select
                    className="form-input login-lang"
                    aria-label={t('langLabel')}
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                  >
                    <option value="en">EN</option>
                    <option value="te">తెలుగు</option>
                    <option value="hi">हिंदी</option>
                  </select>
                  {onToggleTheme && (
                    <button type="button" className="btn btn-ghost" onClick={onToggleTheme} aria-label="Toggle color theme">
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                  )}
                </div>
              </div>

              <h1 className="auth-headline">{t('loginHeadline')}</h1>
              <p className="body-prose briefing-subtitle">{t('loginSubtitle')}</p>

              {busy ? (
                <ol className="load-steps" aria-live="polite" aria-label="Loading repository">
                  {LOAD_STEPS.map((label, i) => {
                    const state = step > i ? 'done' : step === i ? 'active' : 'todo';
                    return (
                      <li key={label} className={`load-step is-${state}`}>
                        <span className="load-step-icon" aria-hidden="true">
                          {state === 'done' ? <CheckCircle size={18} weight="fill" /> : state === 'active' ? <CircleNotch size={18} className="spin" /> : <span className="dot" />}
                        </span>
                        <span>{label}</span>
                        <span className="load-step-state">{state === 'done' ? 'done' : state === 'active' ? 'working' : 'queued'}</span>
                      </li>
                    );
                  })}
                  <li className="load-bar" aria-hidden="true"><span style={{ transform: `scaleX(${Math.min(step + 1, LOAD_STEPS.length) / LOAD_STEPS.length})` }} /></li>
                </ol>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); enter(repo); }} noValidate className="login-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="target-repo">GitHub repository</label>
                    <div className={`repo-field ${error ? 'has-error' : ''}`}>
                      <GitBranch size={18} aria-hidden="true" />
                      <input
                        id="target-repo"
                        ref={inputRef}
                        type="text"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        className="form-input mono-metric"
                        placeholder="https://github.com/owner/repo  or  owner/repo"
                        value={repo}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? 'repo-error-msg' : undefined}
                        onChange={(e) => { setRepo(e.target.value); if (error) setError(''); }}
                      />
                    </div>
                    {error && (
                      <p id="repo-error-msg" className="field-error" role="alert">
                        <WarningOctagon size={14} weight="fill" aria-hidden="true" /> {error}
                      </p>
                    )}
                  </div>

                  <div className="login-presets" role="group" aria-label="Sample repositories">
                    {REPO_PRESETS.map((p) => (
                      <button
                        key={p.url}
                        type="button"
                        className={`btn ${toRepoUrl(repo) === p.url ? 'btn-primary' : 'btn-secondary'} preset-chip`}
                        onClick={() => { setRepo(p.url); setError(''); }}
                      >
                        <span className="mono-metric">{p.name}</span>
                        <span className="preset-badge">{p.badge}</span>
                      </button>
                    ))}
                  </div>

                  <button type="submit" className="btn btn-primary login-form-btn">
                    <span>{t('btnEnterStudio')}</span>
                    <ArrowRight size={16} className="chip-arrow-icon" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn-ghost login-demo-btn" onClick={() => enter(REPO_PRESETS[0].url)}>
                    <Lightning size={14} weight="fill" aria-hidden="true" /> Skip — open the demo repo
                  </button>
                </form>
              )}
            </article>
          </div>
        </div>
      </div>
    </main>
  );
}
