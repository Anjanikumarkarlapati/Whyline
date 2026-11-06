import React from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowUp, ChatCircleText, Code, Graph, Moon, Sun } from '@phosphor-icons/react';
import { useI18n } from '../i18n';

export default function Footer({ theme, onToggleTheme }) {
  const { lang, setLang } = useI18n();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className="site-footer glass-navbar"
      style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-default)',
        background: 'var(--surface-glass, rgba(255, 254, 240, 0.85))',
        padding: '24px 0',
      }}
      aria-label="Site footer"
    >
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="brand-wordmark" style={{ fontSize: '16px' }}>
              Why<span className="brand-wordmark-accent">Line</span>
            </span>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Understand any GitHub repository with plain-English answers, voice explanations, and step-by-step flowcharts.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <NavLink
              to="/"
              end
              className="btn btn-secondary"
              style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              <ChatCircleText size={14} />
              <span>Ask Repo</span>
            </NavLink>
            <NavLink
              to="/answers"
              className="btn btn-secondary"
              style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              <Code size={14} />
              <span>Answers</span>
            </NavLink>
            <NavLink
              to="/flowcharts"
              className="btn btn-secondary"
              style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              <Graph size={14} />
              <span>Flowcharts</span>
            </NavLink>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'Hindi' },
              { code: 'te', label: 'Telugu' },
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                className={`filter-chip ${lang === item.code ? 'active' : ''}`}
                style={{ minHeight: '28px', padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                onClick={() => setLang(item.code)}
              >
                {item.label}
              </button>
            ))}

            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: '32px', padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
              onClick={onToggleTheme}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-icon"
              style={{ minHeight: '32px', minWidth: '32px' }}
              onClick={scrollToTop}
              aria-label="Scroll back to top"
            >
              <ArrowUp size={15} weight="regular" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
