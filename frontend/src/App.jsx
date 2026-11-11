import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { WorkbenchProvider } from './context/WorkbenchContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AskRepoPage from './pages/AskRepoPage';
import AnswersPage from './pages/AnswersPage';
import FlowchartsPage from './pages/FlowchartsPage';
import LegacyRedirect from './components/LegacyRedirect';
import ErrorBoundary from './components/ErrorBoundary';
import RouteAnnouncer from './components/RouteAnnouncer';

function getInitialTheme() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get('theme');
    if (urlTheme === 'dark' || urlTheme === 'light') {
      return urlTheme;
    }
    const saved = window.localStorage?.getItem('whyline-theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  }
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', theme);
    try {
      window.localStorage?.setItem('whyline-theme', theme);
    } catch {
      // Ignore storage error
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <I18nProvider>
      {/* Atmospheric Topographic Field-Grid Background (Aurelia / ui-gradients) */}
      <div className="cartographic-field-bg" aria-hidden="true" />
      {/* Directional OKLCH Ambient Illumination Cone */}
      <div className="ambient-mesh-glow" aria-hidden="true" />
      {/* Archival Tactile Dither Grain Overlay (dither-fx) */}
      <div className="dither-grain-overlay" aria-hidden="true" />

      <div id="route-announcer" className="route-announcer" aria-live="polite" aria-atomic="true" />
      <BrowserRouter>
        <ErrorBoundary>
          <WorkbenchProvider>
            <RouteAnnouncer />
            <Routes>
              <Route path="/login" element={<LoginPage theme={theme} onToggleTheme={toggleTheme} />} />
              <Route element={<Layout theme={theme} onToggleTheme={toggleTheme} />}>
                {/* 3 Beginner-Friendly Developer Pages */}
                <Route path="/" element={<AskRepoPage />} />
                <Route path="/ask" element={<AskRepoPage />} />
                <Route path="/answers" element={<AnswersPage theme={theme} />} />
                <Route path="/flowcharts" element={<FlowchartsPage />} />

                {/* Legacy & Direct Compatibility Routes */}
                <Route path="/studio" element={<AnswersPage theme={theme} />} />
                <Route path="/copilot" element={<LegacyRedirect to="/" />} />
                <Route path="/fences" element={<LegacyRedirect to="/answers" />} />
                <Route path="/memory" element={<LegacyRedirect to="/flowcharts" />} />
                <Route path="/git" element={<LegacyRedirect to="/flowcharts" />} />
                <Route path="/incidents" element={<LegacyRedirect to="/flowcharts" />} />
                <Route path="/settings" element={<LegacyRedirect to="/" />} />

                {/* Catch-all fallback */}
                <Route path="*" element={<LegacyRedirect to="/" />} />
              </Route>
            </Routes>
          </WorkbenchProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </I18nProvider>
  );
}
