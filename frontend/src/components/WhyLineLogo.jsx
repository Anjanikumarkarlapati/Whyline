import React from 'react';

export default function WhyLineLogo({ size = 'md', speaking = false, showTagline = false }) {
  const px = size === 'lg' ? 44 : size === 'sm' ? 28 : 34;

  return (
    <span className={`whyline-logo whyline-logo-${size} ${speaking ? 'is-speaking' : ''}`}>
      <span className="whyline-logo-prism" style={{ width: px, height: px }} aria-hidden="true">
        <svg viewBox="0 0 36 36" fill="none" className="whyline-logo-svg">
          <rect
            x="1.5"
            y="1.5"
            width="33"
            height="33"
            rx="10"
            className="wl-prism-bg"
          />
          <path
            d="M3 10C3 5.5 6.5 2.5 11 2.5H25C29.5 2.5 33 5.5 33 10V13C24 16 12 16 3 13V10Z"
            className="wl-prism-sheen"
          />
          <rect x="8.5" y="10.5" width="2.6" height="14" rx="1.3" className="wl-picket wl-p1" />
          <rect x="14" y="9.5" width="2.6" height="16" rx="1.3" className="wl-picket wl-p2" />
          <rect x="19.5" y="7.5" width="2.8" height="20" rx="1.4" className="wl-picket-hot wl-p3" />
          <rect x="25" y="10.5" width="2.6" height="14" rx="1.3" className="wl-picket wl-p4" />
          <path d="M6.5 17.5H29.5" className="wl-rail" strokeWidth="1.4" strokeLinecap="round" />
          <path
            d="M8.5 25.5C12.5 22.8 16 27.6 19.5 25.2C22.5 23.1 25.2 26.2 28 24.4"
            className="wl-wave"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="whyline-wordmark-wrap">
        <span className="whyline-wordmark">
          <span className="whyline-word-why">Why</span>
          <span className="whyline-word-line">Line</span>
        </span>
        {showTagline && <span className="whyline-tagline">Spoken Fences &amp; Code Archaeology</span>}
      </span>
    </span>
  );
}
