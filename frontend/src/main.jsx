import React from 'react';
import { createRoot } from 'react-dom/client';
/* tokens.css MUST be first — all variables declared before any rule */
import './tokens.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/crimson-text/400.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
/* Indic script faces (script subsets only — avoid overriding Latin glyphs) */
/* Noto Sans Devanagari — UI, variable (weights 400/500/600) */
import '@fontsource/noto-sans-devanagari/devanagari-400.css';
import '@fontsource/noto-sans-devanagari/devanagari-500.css';
import '@fontsource/noto-sans-devanagari/devanagari-600.css';
/* Noto Sans Telugu — UI, variable (weights 400/500/600) */
import '@fontsource/noto-sans-telugu/telugu-400.css';
import '@fontsource/noto-sans-telugu/telugu-500.css';
import '@fontsource/noto-sans-telugu/telugu-600.css';
/* Noto Serif Devanagari — display (weight 400) */
import '@fontsource/noto-serif-devanagari/devanagari-400.css';
/* Noto Serif Telugu — display (weight 400) */
import '@fontsource/noto-serif-telugu/telugu-400.css';
import './styles.css';
import App from './App';

/* F0 Fallback: auto-enable data-fx="lite" on low-end devices */
(function detectFxLite() {
  if (typeof navigator === 'undefined') return;
  const lowMemory = navigator.deviceMemory != null && navigator.deviceMemory <= 4;
  const lowCPU    = navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4;
  if (lowMemory || lowCPU) {
    document.documentElement.setAttribute('data-fx', 'lite');
  }
  /* Respect stored preference from Settings page */
  try {
    const stored = window.localStorage?.getItem('whyline-fx');
    if (stored === 'lite' || stored === 'full') {
      document.documentElement.setAttribute('data-fx', stored);
    }
  } catch { /* ignore */ }
})();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
