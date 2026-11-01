import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import BriefingDashboard from './pages/BriefingDashboard';
import SpokenFencesPage from './pages/SpokenFencesPage';
import IncidentsAndMemoryPage from './pages/IncidentsAndMemoryPage';
import VoiceCoPilotPage from './pages/VoiceCoPilotPage';
import GitFlowchartPage from './pages/GitFlowchartPage';
import SettingsPage from './pages/SettingsPage';
import MonacoCodeStudio from './components/MonacoCodeStudio';

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
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage theme={theme} onToggleTheme={toggleTheme} />} />
          <Route element={<Layout theme={theme} onToggleTheme={toggleTheme} />}>
            <Route path="/" element={<BriefingDashboard theme={theme} />} />
            <Route path="/fences" element={<SpokenFencesPage />} />
            <Route
              path="/studio"
              element={
                <div className="page-stack">
                  <section className="context-header">
                    <div>
                      <p className="context-meta">Code Studio • HealthConnect</p>
                      <h1 className="page-title">Protected Source &amp; Fence Note</h1>
                    </div>
                  </section>
                  <MonacoCodeStudio theme={theme} />
                </div>
              }
            />
            <Route path="/incidents" element={<IncidentsAndMemoryPage />} />
            <Route path="/copilot" element={<VoiceCoPilotPage />} />
            <Route path="/git" element={<GitFlowchartPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
