import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिन्दी' },
];

export default function LanguageSegmentedBar({ className = '' }) {
  const { lang, setLang, t } = useI18n();
  const groupRef = useRef(null);
  const btnRefs = useRef({});
  const [thumb, setThumb] = useState({ x: 0, w: 0, ready: false });
  const [pulsing, setPulsing] = useState(false);

  const measureThumb = () => {
    const activeBtn = btnRefs.current[lang];
    const group = groupRef.current;
    if (!activeBtn || !group) return;
    setThumb({
      x: activeBtn.offsetLeft - 3,
      w: activeBtn.offsetWidth,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    measureThumb();
  }, [lang]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measureThumb());
    ro.observe(group);
    return () => ro.disconnect();
  }, [lang]);

  const handleSelect = (code) => {
    if (code === lang) return;
    setPulsing(true);
    document.documentElement.classList.add('lang-morphing');
    setLang(code);
    setTimeout(() => {
      setPulsing(false);
      document.documentElement.classList.remove('lang-morphing');
    }, 260);
  };

  return (
    <div
      ref={groupRef}
      className={`segmented-control segmented-animated ${pulsing ? 'is-pulsing' : ''} ${className}`.trim()}
      role="group"
      aria-label={t('languageLabel')}
      data-testid="language-segmented-bar"
    >
      <span
        aria-hidden="true"
        className="segmented-thumb"
        style={{
          width: thumb.w ? `${thumb.w}px` : undefined,
          transform: `translate3d(${thumb.x}px, 0, 0)`,
          opacity: thumb.ready ? 1 : 0,
        }}
      />
      {LANG_OPTIONS.map((opt) => {
        const active = lang === opt.code;
        return (
          <button
            key={opt.code}
            ref={(el) => { btnRefs.current[opt.code] = el; }}
            type="button"
            data-lang-option={opt.code}
            className={`segmented-option ${active ? 'is-active' : ''}`}
            aria-pressed={active}
            onClick={() => handleSelect(opt.code)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
