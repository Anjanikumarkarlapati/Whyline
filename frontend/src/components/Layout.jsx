import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ChatCircleText,
  Code,
  FileText,
  GearSix,
  List,
  Moon,
  ShieldCheck,
  SignIn,
  SignOut,
  Sun,
  UserCircle,
  WarningDiamond,
  X,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import AskRepoDrawer from './AskRepoDrawer';

export default function Layout({ theme, onToggleTheme }) {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [askDrawerOpen, setAskDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(true);

  const triggerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        triggerRef.current?.focus();
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

  // Max 5 primary links per specification
  const navItems = [
    { to: '/', label: t('navBriefing'), icon: FileText, end: true },
    { to: '/fences', label: t('navFences'), icon: ShieldCheck },
    { to: '/studio', label: t('navStudio'), icon: Code },
    { to: '/incidents', label: t('navIncidents'), icon: WarningDiamond },
    { to: '/copilot', label: t('navCopilot'), icon: ChatCircleText },
    { to: '/git', label: 'Git Flowchart', icon: Code },
  ];

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="topbar glass-navbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand-link" aria-label="WhyLine Studio Home">
            <span className="brand-mark" aria-hidden="true">W</span>
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
            {/* Single Prominent Action — Never Wraps */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAskDrawerOpen(true)}
              aria-label="Open Ask Repo Co-Pilot"
            >
              <ChatCircleText size={16} weight="regular" aria-hidden="true" />
              <span>Ask Repo</span>
            </button>

            {/* Show Login only when signed out; otherwise unified Account & Settings Menu */}
            {!signedIn ? (
              <NavLink to="/login" className="btn btn-secondary">
                <SignIn size={16} weight="regular" aria-hidden="true" />
                <span>{t('navLogin')}</span>
              </NavLink>
            ) : (
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
            )}

            {menuOpen && (
              <div className="account-popover glass-navbar" role="menu" aria-label="Account and studio settings">
                <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--hairline)' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Anjani Kumar</div>
                  <div className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
                    anjani@healthconnect.in
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
                    <option value="en">English (EN)</option>
                    <option value="te">తెలుగు (TE)</option>
                    <option value="hi">हिंदी (HI)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="form-label">Appearance</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '36px', padding: '0 12px' }}
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
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/settings');
                    }}
                  >
                    <GearSix size={16} weight="regular" aria-hidden="true" />
                    <span>{t('navSettings')}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => {
                      setMenuOpen(false);
                      setSignedIn(false);
                      navigate('/login');
                    }}
                  >
                    <SignOut size={16} weight="regular" aria-hidden="true" />
                    <span>Sign out</span>
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
          <aside id="mobile-slide-drawer" className="mobile-drawer">
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
                <NavLink
                  to="/settings"
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => `drawer-nav-link ${isActive ? 'active' : ''}`}
                >
                  <GearSix size={18} weight="regular" aria-hidden="true" />
                  <span>{t('navSettings')}</span>
                </NavLink>
              </nav>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onToggleTheme}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
              </button>
              <NavLink
                to="/login"
                onClick={() => setDrawerOpen(false)}
                className="btn btn-secondary"
              >
                <SignIn size={16} weight="regular" aria-hidden="true" />
                <span>Switch Repository</span>
              </NavLink>
            </div>
          </aside>
        </div>
      )}

      <main id="main-content" className="main-content" tabIndex={-1}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <AskRepoDrawer isOpen={askDrawerOpen} onClose={() => setAskDrawerOpen(false)} />
    </div>
  );
}
