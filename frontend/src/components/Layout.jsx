import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChatCircleText,
  Compass,
  Gear,
  GitBranch,
  Graph,
  List,
  Moon,
  SpeakerHigh,
  Sun,
  X,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import { useVoiceAgent } from '../context/VoiceAgentContext';
import WhyLineLogo from './WhyLineLogo';
import LanguageSegmentedBar from './LanguageSegmentedBar';
import MenuShaderLayer from './MenuShaderLayer';
import RouteBackdrop from './RouteBackdrop';
import VoiceAgentPicker from './VoiceAgentPicker';
import LanguageVoiceToast from './LanguageVoiceToast';
import Footer from './Footer';
import SessionModal from './SessionModal';

const LANG_OPTIONS = [
  { code: 'en', label: 'English', shortLabel: 'English' },
  { code: 'te', label: 'తెలుగు', shortLabel: 'తెలుగు' },
  { code: 'hi', label: 'हिन्दी', shortLabel: 'हिन्दी' },
];

export default function Layout({ theme, onToggleTheme }) {
  const { lang, setLang, t } = useI18n();
  const { selectedAgent, isSpeaking, firstRunOpen, dismissFirstRun } = useVoiceAgent();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [voicePopoverOpen, setVoicePopoverOpen] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const [navPill, setNavPill] = useState({ x: 0, w: 0, ready: false });

  const triggerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);
  const desktopNavRef = useRef(null);
  const navLinkRefs = useRef({});

  // Global Ctrl/Cmd+K shortcut to navigate to /ask
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
        if (document.startViewTransition) {
          document.startViewTransition(() => navigate('/ask'));
        } else {
          navigate('/ask');
        }
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

  const navItems = [
    { to: '/', label: t('navOverview'), icon: Compass, end: true },
    { to: '/connect', label: t('navConnect'), icon: GitBranch },
    { to: '/ask', label: t('navAskRepo'), icon: ChatCircleText },
    { to: '/flow', label: t('navFlowChat'), icon: Graph },
    { to: '/settings', label: t('navSettings'), icon: Gear },
  ];

  const measureNavPill = () => {
    const navEl = desktopNavRef.current;
    if (!navEl) return;
    const activeItem = navItems.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
    const activeEl = activeItem ? navLinkRefs.current[activeItem.to] : null;
    if (!activeEl) {
      setNavPill((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    setNavPill({
      x: activeEl.offsetLeft,
      w: activeEl.offsetWidth,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    measureNavPill();
  }, [pathname, lang]);

  useEffect(() => {
    const navEl = desktopNavRef.current;
    if (!navEl || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measureNavPill());
    ro.observe(navEl);
    return () => ro.disconnect();
  }, [pathname, lang]);

  return (
    <div className="app-shell">
      <RouteBackdrop />
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>

      <header
        className="topbar glass-navbar glass-strong"
        onMouseEnter={() => setMenuHovered(true)}
        onMouseLeave={() => setMenuHovered(false)}
      >
        <MenuShaderLayer theme={theme} hoverEnergy={menuHovered ? 1 : 0} />
        <div
          className="container topbar-inner"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', position: 'relative', zIndex: 2 }}
        >
          <NavLink to="/" viewTransition className="brand-link" aria-label="WhyLine Home" style={{ flexShrink: 0 }}>
            <WhyLineLogo size="sm" speaking={isSpeaking} />
          </NavLink>

          <nav ref={desktopNavRef} className="desktop-nav" aria-label="Primary navigation">
            <span
              aria-hidden="true"
              className="desktop-nav-pill"
              style={{
                width: navPill.w ? `${navPill.w}px` : 0,
                transform: `translate3d(${navPill.x}px, 0, 0)`,
                opacity: navPill.ready ? 1 : 0,
              }}
            />
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  ref={(el) => {
                    navLinkRefs.current[item.to] = el;
                  }}
                  to={item.to}
                  end={item.end}
                  viewTransition
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  style={{ whiteSpace: 'nowrap', flexShrink: 0, '--i': idx }}
                >
                  <Icon className="nav-link-icon" size={16} weight="regular" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="topbar-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <LanguageSegmentedBar />

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                data-testid="topbar-voice-chip"
                aria-expanded={voicePopoverOpen}
                aria-label={t('voiceAgentChipAria')}
                onClick={() => setVoicePopoverOpen((v) => !v)}
              >
                <SpeakerHigh size={15} weight={isSpeaking ? 'fill' : 'regular'} aria-hidden="true" />
                <span>{selectedAgent.displayName}</span>
              </button>

              {voicePopoverOpen && (
                <div
                  className="glass-sheet nav-popover-animated"
                  role="dialog"
                  aria-label={t('voicePickerTitle')}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: 'min(380px, 92vw)',
                    maxHeight: '72vh',
                    overflowY: 'auto',
                    padding: '16px',
                    zIndex: 60,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ fontSize: 'var(--type-sm)' }}>{t('voicePickerTitle')}</strong>
                    <button
                      type="button"
                      className="btn btn-tertiary btn-sm"
                      onClick={() => {
                        setVoicePopoverOpen(false);
                        navigate('/settings');
                      }}
                    >
                      {t('navSettings')}
                    </button>
                  </div>
                  <VoiceAgentPicker variant="popover" onSelectComplete={() => setVoicePopoverOpen(false)} />
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} weight="regular" aria-hidden="true" /> : <Moon size={16} weight="regular" aria-hidden="true" />}
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
          <aside id="mobile-slide-drawer" className="mobile-drawer glass-sheet" ref={drawerRef}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <WhyLineLogo size="sm" />
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
                {navItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      viewTransition
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) => `drawer-nav-link ${isActive ? 'active' : ''}`}
                      style={{ '--i': idx }}
                    >
                      <Icon className="nav-link-icon" size={18} weight="regular" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <LanguageSegmentedBar />
              <button type="button" className="btn btn-secondary" onClick={onToggleTheme}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
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
      <LanguageVoiceToast />

      {firstRunOpen && (
        <div
          className="drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t('voiceFirstRunTitle')}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            background: 'rgba(28, 28, 18, 0.38)',
          }}
        >
          <div
            className="glass-sheet reveal-stagger"
            data-testid="first-run-voice-sheet"
            style={{
              width: 'min(640px, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <h2 className="card-title" style={{ margin: '0 0 4px 0', fontSize: 'var(--type-lg)' }}>
                  {t('voiceFirstRunTitle')}
                </h2>
                <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)' }}>
                  {t('voiceFirstRunDesc')}
                </p>
              </div>
              <button type="button" className="btn btn-tertiary btn-sm" onClick={dismissFirstRun}>
                {t('voiceKeepUsing')}
              </button>
            </div>
            <VoiceAgentPicker variant="sheet" />
          </div>
        </div>
      )}
    </div>
  );
}
