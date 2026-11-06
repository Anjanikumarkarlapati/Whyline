import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
import Layout from './components/Layout';
import BriefingDashboard from './pages/BriefingDashboard';
import WorkbenchPage from './pages/WorkbenchPage';
import MemoryPage from './pages/MemoryPage';
import SettingsPage from './pages/SettingsPage';
import TypographyPage from './pages/TypographyPage';
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
      {/* ARIA live region for route change announcements */}
      <div id="route-announcer" className="route-announcer" aria-live="polite" />
      <BrowserRouter>
        <ErrorBoundary>
          <RouteAnnouncer />
          <Routes>
            <Route element={<Layout theme={theme} onToggleTheme={toggleTheme} />}>
              {/* Target 4-Page Information Architecture */}
              <Route path="/" element={<BriefingDashboard theme={theme} />} />
              <Route path="/studio" element={<WorkbenchPage theme={theme} />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Legacy Redirects (Preserve query params and inject target defaults) */}
              <Route path="/fences" element={<LegacyRedirect to="/studio" defaultParams={{ panel: 'fence' }} />} />
              <Route path="/copilot" element={<LegacyRedirect to="/studio" defaultParams={{ panel: 'ask' }} />} />
              <Route path="/git" element={<LegacyRedirect to="/memory" defaultParams={{ view: 'graph' }} />} />
              <Route path="/incidents" element={<LegacyRedirect to="/memory" defaultParams={{ view: 'ledger' }} />} />
              <Route path="/login" element={<LegacyRedirect to="/settings" />} />

              {/* Dev-only Route (Typography showcase) */}
              {import.meta.env.DEV && <Route path="/dev/typography" element={<TypographyPage />} />}

              {/* Catch-all fallback */}
              <Route path="*" element={<LegacyRedirect to="/" />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </I18nProvider>
  );
}
