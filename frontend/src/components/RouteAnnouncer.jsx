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
      '/': 'Briefing Dashboard',
      '/fences': 'Spoken Fences Ledger',
      '/studio': 'Protected Source and Fence Note',
      '/incidents': 'Incidents and Dead End Memory',
      '/copilot': 'Voice Co Pilot',
      '/git': 'Repository Flowchart',
      '/settings': 'Studio and Model Settings',
      '/dev/typography': 'Dev Typography Verification',
      '/login': 'Login',
    };

    const message = pathNames[location.pathname] || 'Page changed';
    announcer.textContent = '';
    // Reset then set so screen readers re-announce even on same path
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }, [location]);

  return null;
}
