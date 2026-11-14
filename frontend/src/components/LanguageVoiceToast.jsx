import React, { useEffect, useState } from 'react';
import { SpeakerHigh, X } from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import { useVoiceAgent } from '../context/VoiceAgentContext';

const LANG_NAMES = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
};

export default function LanguageVoiceToast() {
  const { t } = useI18n();
  const { selectedAgent, selectAgent, getDefaultForLanguage } = useVoiceAgent();
  const [pendingLang, setPendingLang] = useState(null);

  useEffect(() => {
    const onLangChanged = (e) => {
      const nextLang = e.detail?.lang;
      if (!nextLang) return;
      if (selectedAgent.language !== nextLang) {
        setPendingLang(nextLang);
      } else {
        setPendingLang(null);
      }
    };
    window.addEventListener('whyline-lang-changed', onLangChanged);
    return () => window.removeEventListener('whyline-lang-changed', onLangChanged);
  }, [selectedAgent.language]);

  useEffect(() => {
    if (!pendingLang) return undefined;
    const timer = setTimeout(() => setPendingLang(null), 9000);
    return () => clearTimeout(timer);
  }, [pendingLang]);

  if (!pendingLang) return null;

  const targetAgent = getDefaultForLanguage(pendingLang);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="language-voice-toast"
      className="glass-strong reveal-stagger"
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 80,
        padding: '12px 16px',
        borderRadius: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: 'min(420px, calc(100vw - 32px))',
      }}
    >
      <SpeakerHigh size={18} weight="regular" style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
      <span style={{ fontSize: 'var(--type-sm)', color: 'var(--text-primary)' }}>
        {t('voiceSwitchToastPrompt', { language: LANG_NAMES[pendingLang] || pendingLang })}
      </span>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => {
          selectAgent(targetAgent.id);
          setPendingLang(null);
        }}
      >
        {t('voiceSwitchAction')}
      </button>
      <button
        type="button"
        className="btn btn-tertiary btn-sm"
        onClick={() => setPendingLang(null)}
      >
        {t('voiceKeepAction')}
      </button>
      <button
        type="button"
        className="btn btn-tertiary btn-icon"
        style={{ minWidth: '32px', minHeight: '32px' }}
        aria-label={t('closeMenuAria')}
        onClick={() => setPendingLang(null)}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
