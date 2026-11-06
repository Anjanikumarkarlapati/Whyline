import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * RouteAnnouncer — announces route changes to screen readers.
 * Reads the current location and speaks the page title via an ARIA live region.
 * Placed once at the App level so every navigation triggers an announcement.
 */
export default function RouteAnnouncer() {
  const location = useLocation();

  useEffect(() => {
    const announcer = document.getElementById('route-announcer');
    if (!announcer) return;

    const pathNames = {
      '/': 'Home Briefing Dashboard',
      '/studio': 'Code Workbench and Spoken Fences',
      '/memory': 'Memory and Provenance',
      '/settings': 'Studio Settings and Model Configuration',
      '/fences': 'Spoken Fences Ledger',
      '/incidents': 'Incidents and Dead End Memory',
      '/copilot': 'Voice Co Pilot',
      '/git': 'Repository Flowchart',
      '/dev/typography': 'Dev Typography Verification',
      '/login': 'Login and Session',
    };

    const message = pathNames[location.pathname] || 'Page changed';
    announcer.textContent = '';
    const timer = setTimeout(() => {
      announcer.textContent = message;
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
}
