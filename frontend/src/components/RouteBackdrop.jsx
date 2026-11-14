import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';

export default function RouteBackdrop() {
  const { pathname } = useLocation();
  const { lang } = useI18n();
  const layerRef = useRef(null);

  useEffect(() => {
    const el = layerRef.current;
    if (!el) return undefined;

    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || reduced) return undefined;

    let raf = 0;
    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const nx = (e.clientX / window.innerWidth - 0.5) * 12;
        const ny = (e.clientY / window.innerHeight - 0.5) * 12;
        el.style.transform = `translate3d(${nx.toFixed(2)}px, ${ny.toFixed(2)}px, 0)`;
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const routeKind = pathname.startsWith('/ask')
    ? 'ask'
    : pathname.startsWith('/flow')
      ? 'flow'
      : pathname.startsWith('/settings')
        ? 'settings'
        : 'landing';

  const watermarkGlyph = lang === 'te' ? 'అ' : lang === 'hi' ? 'अ' : '';

  return (
    <div className={`route-backdrop route-backdrop-${routeKind}`} aria-hidden="true">
      <div ref={layerRef} className="route-backdrop-parallax">
        {routeKind === 'landing' && (
          <svg className="route-backdrop-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="wlGrain">
                <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="2" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </feFilter>
              <radialGradient id="wlAuroraA" cx="22%" cy="28%" r="48%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="wlAuroraB" cx="78%" cy="72%" r="52%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1200" height="800" fill="url(#wlAuroraA)" />
            <rect width="1200" height="800" fill="url(#wlAuroraB)" />
            <rect width="1200" height="800" filter="url(#wlGrain)" opacity="0.06" />
          </svg>
        )}

        {routeKind === 'ask' && (
          <svg className="route-backdrop-svg route-backdrop-drift" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            <g fill="none" stroke="currentColor" strokeOpacity="0.10" strokeWidth="1.2">
              <path d="M-40 140 C 260 60, 520 220, 860 120 S 1140 160, 1260 90" />
              <path d="M-40 280 C 220 200, 480 340, 820 260 S 1100 320, 1260 240" />
              <path d="M-40 420 C 280 350, 560 490, 900 400 S 1120 460, 1260 390" />
              <path d="M-40 580 C 240 510, 520 650, 840 560 S 1100 620, 1260 550" />
              <path d="M-40 710 C 300 640, 580 770, 920 690 S 1140 740, 1260 680" />
            </g>
          </svg>
        )}

        {routeKind === 'flow' && (
          <svg className="route-backdrop-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="wlDotLattice" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.1" fill="currentColor" fillOpacity="0.12" />
              </pattern>
            </defs>
            <rect width="1200" height="800" fill="url(#wlDotLattice)" />
            <path
              d="M120 620 C 310 510, 420 340, 620 360 S 920 220, 1080 160"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.16"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="120" cy="620" r="5" fill="currentColor" fillOpacity="0.18" />
            <circle cx="620" cy="360" r="5" fill="currentColor" fillOpacity="0.18" />
            <circle cx="1080" cy="160" r="5" fill="currentColor" fillOpacity="0.18" />
          </svg>
        )}

        {routeKind === 'settings' && (
          <svg className="route-backdrop-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            <path
              d="M-40 440 C 180 340, 360 540, 600 420 C 840 300, 1020 500, 1240 380"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.13"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M-40 500 C 200 410, 390 590, 620 480 C 860 370, 1040 540, 1240 440"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="16"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {watermarkGlyph && (
        <span className="route-indic-watermark" aria-hidden="true">
          {watermarkGlyph}
        </span>
      )}
    </div>
  );
}
