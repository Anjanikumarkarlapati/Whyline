import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { WorkbenchProvider } from './context/WorkbenchContext';
import { VoiceAgentProvider } from './context/VoiceAgentContext';
import Layout from './components/Layout';
import RouteAnnouncer from './components/RouteAnnouncer';
import LegacyRedirect from './components/LegacyRedirect';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AskRepoPage = lazy(() => import('./pages/AskRepoPage'));
const FlowchartsPage = lazy(() => import('./pages/FlowchartsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function RouteSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px 0' }} aria-busy="true" aria-label="Loading page">
      <div className="skeleton-shimmer" style={{ height: '36px', width: '42%' }} />
      <div className="skeleton-shimmer" style={{ height: '140px', width: '100%' }} />
      <div className="skeleton-shimmer" style={{ height: '96px', width: '80%' }} />
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('whyline_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('whyline_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <I18nProvider>
        <VoiceAgentProvider>
          <WorkbenchProvider>
            <RouteAnnouncer />
            <Suspense fallback={<RouteSkeleton />}>
              <Routes>
                <Route path="/" element={<Layout theme={theme} onToggleTheme={toggleTheme} />}>
                  <Route index element={<LandingPage />} />
                  <Route path="connect" element={<LoginPage theme={theme} onToggleTheme={toggleTheme} />} />
                  <Route path="ask" element={<AskRepoPage />} />
                  <Route path="flow" element={<FlowchartsPage />} />
                  <Route path="settings" element={<SettingsPage theme={theme} onToggleTheme={toggleTheme} />} />

                  {/* Backward-compatible route aliases */}
                  <Route path="login" element={<LegacyRedirect to="/connect" />} />
                  <Route path="voice-copilot" element={<LegacyRedirect to="/ask" />} />
                  <Route path="answers" element={<LegacyRedirect to="/ask" />} />
                  <Route path="flowcharts" element={<LegacyRedirect to="/flow" />} />
                  <Route path="workbench" element={<LegacyRedirect to="/ask" />} />
                  <Route path="fences" element={<LegacyRedirect to="/ask" />} />
                  <Route path="incidents" element={<LegacyRedirect to="/ask" />} />
                  <Route path="memory" element={<LegacyRedirect to="/ask" />} />
                  <Route path="typography" element={<LegacyRedirect to="/settings" />} />
                  <Route path="*" element={<LegacyRedirect to="/" />} />
                </Route>
              </Routes>
            </Suspense>
          </WorkbenchProvider>
        </VoiceAgentProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
