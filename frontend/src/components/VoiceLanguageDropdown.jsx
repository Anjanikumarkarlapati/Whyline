import React from 'react';
import { GlobeHemisphereWest, SpeakerHigh } from '@phosphor-icons/react';

export const VOICE_LANGUAGE_OPTIONS = [
  {
    code: 'en',
    locale: 'en-IN',
    voice: 'Pranav',
    label: 'English (Pranav • en-IN)',
    shortLabel: 'English',
  },
  {
    code: 'hi',
    locale: 'hi-IN',
    voice: 'Bhavna',
    label: 'हिंदी / Hindi (Bhavna • hi-IN)',
    shortLabel: 'Hindi (हिंदी)',
  },
  {
    code: 'te',
    locale: 'te-IN',
    voice: 'Nalini',
    label: 'తెలుగు / Telugu (Nalini • te-IN)',
    shortLabel: 'Telugu (తెలుగు)',
  },
];

export default function VoiceLanguageDropdown({
  value = 'en',
  onChange,
  id = 'query-voice-lang-select',
  disabled = false,
  compact = false,
}) {
  const normalizedValue =
    value === 'hi' || value === 'hi-IN'
      ? 'hi'
      : value === 'te' || value === 'te-IN'
        ? 'te'
        : 'en';

  const activeOption =
    VOICE_LANGUAGE_OPTIONS.find((opt) => opt.code === normalizedValue) ||
    VOICE_LANGUAGE_OPTIONS[0];

  const handleSelectChange = (e) => {
    const nextCode = e.target.value;
    const found =
      VOICE_LANGUAGE_OPTIONS.find((opt) => opt.code === nextCode) ||
      VOICE_LANGUAGE_OPTIONS[0];
    if (onChange) {
      onChange(found.code, found);
    }
  };

  return (
    <div
      className="voice-language-dropdown"
      data-testid="voice-language-dropdown-wrapper"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-strong)',
        borderRadius: '10px',
        padding: compact ? '2px 8px' : '4px 10px',

      }}
    >
      <GlobeHemisphereWest
        size={15}
        weight="duotone"
        style={{ color: 'var(--accent)', flexShrink: 0 }}
        aria-hidden="true"
      />
      <label
        htmlFor={id}
        className="small-caps"
        style={{
          fontSize: '10px',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          margin: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Voice Output:
      </label>
      <select
        id={id}
        data-testid="voice-language-select"
        aria-label="Voice synthesis output language"
        className="form-select"
        value={normalizedValue}
        disabled={disabled}
        onChange={handleSelectChange}
        style={{
          minHeight: compact ? '26px' : '30px',
          padding: '2px 24px 2px 8px',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'DM Mono, monospace',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {VOICE_LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        className="mono-metric"
        title={`Active neural voice: ${activeOption.voice} (${activeOption.locale})`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '999px',
          background: 'var(--accent-wash)',
          color: 'var(--accent)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <SpeakerHigh size={11} weight="fill" aria-hidden="true" />
        <span>{activeOption.voice}</span>
      </span>
    </div>
  );
}
