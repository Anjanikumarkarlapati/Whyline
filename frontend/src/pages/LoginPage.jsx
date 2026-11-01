import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Moon, ShieldCheck, Sun } from '@phosphor-icons/react';
import { useI18n } from '../i18n';

export default function LoginPage({ theme = 'light', onToggleTheme }) {
  const { t } = useI18n();
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
        <article className="card auth-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Brand & Theme Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="brand-mark" aria-hidden="true">
                  W
                </span>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>
                    WhyLine Studio
                  </span>
                  <span className="small-caps" style={{ display: 'block' }}>
                    Spoken Fence &amp; Provenance Ledger
                  </span>
                </div>
              </div>

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

            <div>
              <h1 className="auth-headline">{t('loginHeadline')}</h1>
              <p className="body-prose" style={{ color: 'var(--ink-muted)', marginTop: '8px' }}>
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

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', width: '100%' }}>
                <ShieldCheck size={18} weight="regular" aria-hidden="true" />
                <span>{t('btnEnterStudio')}</span>
                <ArrowRight size={16} weight="regular" aria-hidden="true" />
              </button>
            </form>
          </div>
        </article>
      </div>
    </main>
  );
}
