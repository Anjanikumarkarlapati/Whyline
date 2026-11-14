import React, { useMemo } from 'react';
import { CheckCircle, Play, Stop, Waveform } from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import { useVoiceAgent } from '../context/VoiceAgentContext';

export default function VoiceAgentPicker({ variant = 'panel', onSelectComplete }) {
  const { lang, t } = useI18n();
  const { agents, selectedAgent, selectAgent, previewAgent, previewingId } = useVoiceAgent();

  const sortedAgents = useMemo(() => {
    const matching = agents.filter((a) => a.language === lang);
    const others = agents.filter((a) => a.language !== lang);
    return [...matching, ...others];
  }, [agents, lang]);

  const isCompact = variant === 'popover';

  return (
    <div
      className={`voice-picker voice-picker-${variant}`}
      style={{
        display: 'grid',
        gridTemplateColumns: isCompact ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: isCompact ? '8px' : '12px',
      }}
    >
      {sortedAgents.map((agent) => {
        const isSelected = selectedAgent.id === agent.id;
        const isPlaying = previewingId === agent.id;

        return (
          <div
            key={agent.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            data-testid={`voice-card-${agent.id}`}
            className={`voice-agent-card glass ${isSelected ? 'is-selected' : ''}`}
            onClick={() => {
              selectAgent(agent.id);
              if (onSelectComplete) onSelectComplete(agent);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectAgent(agent.id);
                if (onSelectComplete) onSelectComplete(agent);
              }
            }}
            style={{
              padding: isCompact ? '10px 12px' : '14px 16px',
              borderRadius: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              border: isSelected ? '2px solid var(--accent)' : undefined,
              background: isSelected ? 'var(--accent-wash)' : undefined,
              transition: 'transform var(--dur-mid) var(--ease-out), border-color var(--dur-mid) var(--ease-out)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <strong style={{ fontSize: 'var(--type-sm)', color: 'var(--text-primary)' }}>
                  {agent.displayName}
                </strong>
                <span
                  className="badge"
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'var(--bg-raised)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {agent.languageLabel}
                </span>
                <span
                  className="badge"
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {agent.tone}
                </span>
              </div>

              {isSelected && (
                <CheckCircle
                  size={18}
                  weight="fill"
                  style={{ color: 'var(--accent)', flexShrink: 0 }}
                  aria-label={t('voiceSelected')}
                />
              )}
            </div>

            {!isCompact && (
              <p style={{ margin: 0, fontSize: 'var(--type-xs)', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {agent.sampleText}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                data-testid={`voice-preview-${agent.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  previewAgent(agent);
                }}
              >
                {isPlaying ? <Stop size={14} weight="fill" aria-hidden="true" /> : <Play size={14} weight="fill" aria-hidden="true" />}
                <span>{isPlaying ? t('voiceStopPreview') : t('voicePreview')}</span>
              </button>

              {isPlaying ? (
                <span className="voice-live-wave" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', height: '18px' }}>
                  <span className="wave-bar" style={{ animationDelay: '0ms' }} />
                  <span className="wave-bar" style={{ animationDelay: '120ms' }} />
                  <span className="wave-bar" style={{ animationDelay: '240ms' }} />
                  <span className="wave-bar" style={{ animationDelay: '90ms' }} />
                </span>
              ) : (
                <span className="mono-metric" style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Waveform size={13} aria-hidden="true" />
                  {agent.model}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
