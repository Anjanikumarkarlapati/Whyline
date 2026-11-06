import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ChatCircleText,
  ClockCounterClockwise,
  Code,
  GearSix,
  House,
  List,
  Moon,
  Sun,
  UserCircle,
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
  const [menuOpen, setMenuOpen] = useState(false);

  const triggerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const menuRef = useRef(null);
  const drawerRef = useRef(null);
  const askBtnRef = useRef(null);

  // Global Ctrl/Cmd+K shortcut to navigate to /studio?panel=ask
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
        navigate('/studio?panel=ask');
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

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Exactly 4 primary routes in the consolidated Information Architecture
  const navItems = [
    { to: '/', label: t('navHome'), icon: House, end: true },
    { to: '/studio', label: t('navWorkbench'), icon: Code },
    { to: '/memory', label: t('navMemory'), icon: ClockCounterClockwise },
    { to: '/settings', label: t('navSettings'), icon: GearSix },
  ];

  const handleOpenAsk = () => {
    navigate('/studio?panel=ask');
    setTimeout(() => {
      const askInput =
        document.getElementById('workbench-ask-input') ||
        document.querySelector('textarea, input[placeholder*="Ask"]');
      askInput?.focus();
    }, 120);
  };

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="topbar glass-navbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand-link" aria-label="WhyLine Studio Home">
            <img src="/logo.svg" alt="" aria-hidden="true" className="brand-mark" width="28" height="28" />
            <span className="brand-wordmark">
              Why<span className="brand-wordmark-accent">Line</span>
            </span>
          </NavLink>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} weight="regular" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="topbar-controls" ref={menuRef}>
            {/* Ask Repo Action with Ctrl+K shortcut badge */}
            <button
              ref={askBtnRef}
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAsk}
              aria-label="Open Ask Repo Co-Pilot (Shortcut: Ctrl+K)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ChatCircleText size={16} weight="regular" aria-hidden="true" />
              <span>Ask Repo</span>
              <kbd
                className="shortcut-badge"
                style={{
                  fontSize: '10px',
                  lineHeight: '1',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.22)',
                  fontFamily: 'DM Mono, monospace',
                  letterSpacing: '0.02em',
                }}
              >
                Ctrl K
              </kbd>
            </button>

            {/* Unified Account & Session Popover */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Account, theme, and language menu"
            >
              <UserCircle size={18} weight="regular" aria-hidden="true" />
              <span className="mono-metric">@anjani</span>
            </button>

            {menuOpen && (
              <div className="account-popover glass-navbar" role="region" aria-label="Account and studio settings">
                <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--hairline)' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Anjani Kumar</div>
                  <div className="mono-metric" style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>
                    Lead SRE • anjani@healthconnect.in
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 6px' }}>
                      HealthConnect Gateway v1
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="nav-lang-select">
                    {t('langLabel')}
                  </label>
                  <select
                    id="nav-lang-select"
                    className="form-select"
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                  >
                    <option value="en">English (EN • Pranav voice)</option>
                    <option value="te">తెలుగు (Telugu • Nalini voice)</option>
                    <option value="hi">हिंदी (Hindi • Bhavna voice)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="form-label">Appearance</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px' }}
                    onClick={onToggleTheme}
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun size={15} weight="regular" aria-hidden="true" />
                        <span>Light mode</span>
                      </>
                    ) : (
                      <>
                        <Moon size={15} weight="regular" aria-hidden="true" />
                        <span>Dark mode</span>
                      </>
                    )}
                  </button>
                </div>

                <div
                  style={{
                    paddingTop: '12px',
                    borderTop: '1px solid var(--hairline)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ justifyContent: 'flex-start', fontSize: '13px' }}
                    onClick={() => {
                      setMenuOpen(false);
                      setSessionModalOpen(true);
                    }}
                  >
                    <UserCircle size={16} weight="regular" aria-hidden="true" />
                    <span>Switch Session / Repo</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ justifyContent: 'flex-start', fontSize: '13px' }}
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/settings');
                    }}
                  >
                    <GearSix size={16} weight="regular" aria-hidden="true" />
                    <span>{t('navSettings')}</span>
                  </button>
                </div>
              </div>
            )}

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
          aria-label="Mobile navigation sheet"
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
                  {t('langLabel')}
                </label>
                <select
                  id="drawer-lang-select"
                  className="form-select"
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                >
                  <option value="en">English (EN)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onToggleTheme}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setDrawerOpen(false);
                  setSessionModalOpen(true);
                }}
              >
                <UserCircle size={16} weight="regular" aria-hidden="true" />
                <span>Switch Session / Repo</span>
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

      <Footer
        theme={theme}
        onToggleTheme={onToggleTheme}
        onOpenAskDrawer={handleOpenAsk}
      />

      <SessionModal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
      />
    </div>
  );
}
