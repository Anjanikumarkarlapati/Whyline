import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ChatCircleText,
  Code,
  GitBranch,
  Graph,
  List,
  Moon,
  Sun,
  X,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import Footer from './Footer';
import SessionModal from './SessionModal';

export default function Layout({ theme, onToggleTheme }) {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [activeRepoName, setActiveRepoName] = useState('HealthConnect/payment-gateway-v1');

  const triggerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    fetch('/api/github/current')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.repo?.fullName) setActiveRepoName(data.repo.fullName);
      })
      .catch(() => {});

    const handleRepoUpdated = (e) => {
      if (e.detail?.repo?.fullName) {
        setActiveRepoName(e.detail.repo.fullName);
      }
    };
    window.addEventListener('whyline-repo-updated', handleRepoUpdated);
    return () => window.removeEventListener('whyline-repo-updated', handleRepoUpdated);
  }, []);

  // Global Ctrl/Cmd+K shortcut to navigate to Ask Repo
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        const activeEl = document.activeElement;
        if (
          activeEl?.closest('.monaco-editor') ||
          activeEl?.tagName === 'INPUT' ||
          activeEl?.tagName === 'TEXTAREA'
        ) {
          return;
        }
        e.preventDefault();
        navigate('/');
        setTimeout(() => {
          const askInput =
            document.getElementById('workbench-ask-input') ||
            document.querySelector('textarea, input[placeholder*="Ask"]');
          askInput?.focus();
        }, 120);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [navigate]);

  // Mobile drawer: focus trap + focus restoration
  useEffect(() => {
    if (!drawerOpen) return undefined;

    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        triggerRef.current?.focus();
      }
      if (e.key === 'Tab') {
        const focusable = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  // Exactly 3 beginner-friendly developer routes
  const navItems = [
    { to: '/', label: 'Ask Repo', icon: ChatCircleText, end: true },
    { to: '/answers', label: 'Answers', icon: Code },
    { to: '/flowcharts', label: 'Flowcharts', icon: Graph },
  ];

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="topbar glass-navbar">
        <div
          className="container topbar-inner"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px' }}
        >
          {/* Zone 1: Single-line Brand Wordmark */}
          <NavLink
            to="/"
            className="brand-link"
            aria-label="WhyLine Home"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <img src="/logo.svg" alt="" aria-hidden="true" className="brand-mark" width="26" height="26" />
            <span className="brand-wordmark">
              Why<span className="brand-wordmark-accent">Line</span>
            </span>
          </NavLink>

          {/* Zone 2: 3 Clean Single-Line Navigation Links */}
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  <Icon size={16} weight="regular" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Zone 3: Active GitHub Repo Switcher & Appearance Toggle */}
          <div className="topbar-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              data-testid="topbar-github-repo-btn"
              className="btn btn-secondary"
              onClick={() => setSessionModalOpen(true)}
              aria-label="Change GitHub repository"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '0 12px',
                whiteSpace: 'nowrap',
              }}
            >
              <GitBranch size={15} weight="bold" style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <span
                className="mono-metric"
                style={{
                  maxWidth: '190px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeRepoName}
              </span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '0 10px',
                whiteSpace: 'nowrap',
              }}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} weight="regular" aria-hidden="true" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon size={15} weight="regular" aria-hidden="true" />
                  <span>Dark</span>
                </>
              )}
            </button>

            <button
              ref={triggerRef}
              type="button"
              className="btn btn-secondary btn-icon mobile-menu-btn"
              aria-expanded={drawerOpen}
              aria-controls="mobile-slide-drawer"
              aria-label={t('openMenuAria')}
              onClick={() => setDrawerOpen(true)}
            >
              <List size={18} weight="regular" />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div
          className="drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDrawerOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <aside id="mobile-slide-drawer" className="mobile-drawer" ref={drawerRef}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="brand-wordmark">
                  Why<span className="brand-wordmark-accent">Line</span>
                </span>
                <button
                  ref={closeBtnRef}
                  type="button"
                  className="btn btn-secondary btn-icon"
                  aria-label={t('closeMenuAria')}
                  onClick={() => {
                    setDrawerOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  <X size={18} weight="regular" />
                </button>
              </div>

              <nav className="drawer-nav-list" aria-label="Mobile navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) => `drawer-nav-link ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={18} weight="regular" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="drawer-lang-select">
                  Voice Language
                </label>
                <select
                  id="drawer-lang-select"
                  className="form-select"
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                >
                  <option value="en">English (EN)</option>
                  <option value="te">Telugu</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
              <button type="button" className="btn btn-secondary" onClick={onToggleTheme}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setDrawerOpen(false);
                  setSessionModalOpen(true);
                }}
              >
                <GitBranch size={16} weight="regular" aria-hidden="true" />
                <span>Change GitHub Repo</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <main id="main-content" className="main-content" tabIndex={-1}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <Footer theme={theme} onToggleTheme={onToggleTheme} />

      <SessionModal isOpen={sessionModalOpen} onClose={() => setSessionModalOpen(false)} />
    </div>
  );
}
