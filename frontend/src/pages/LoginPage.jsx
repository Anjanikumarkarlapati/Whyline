import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Moon, ShieldCheck, Sun } from '@phosphor-icons/react';
import { useI18n } from '../i18n';

export default function LoginPage({ theme = 'light', onToggleTheme }) {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('anjani@healthconnect.in');
  const [repo, setRepo] = useState('demo-repos/HealthConnect');
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

    if (!repo.trim()) {
      setRepoError('Select a repository to inspect.');
      valid = false;
    } else {
      setRepoError('');
    }

    if (valid) {
      navigate('/');
    }
  };

  return (
    <main className="container">
      <div className="auth-centered">
        <div className="auth-card-container">
          <div className="auth-offset-slab" aria-hidden="true" />
          <article className="card auth-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                  <option value="demo-repos/HealthConnect">
                    demo-repos/HealthConnect (10 Seeded Fences • PR #212)
                  </option>
                </select>
                {repoError && (
                  <p id="repo-error-msg" className="field-error" role="alert">
                    {repoError}
                  </p>
                )}
              </div>

              <button type="submit" className="btn btn-primary login-form-btn">
                <ShieldCheck size={18} weight="regular" aria-hidden="true" />
                <span>{t('btnEnterStudio')}</span>
                <ArrowRight size={16} weight="regular" aria-hidden="true" />
              </button>
            </form>
          </div>
        </article>
        </div>
      </div>
    </main>
  );
}
