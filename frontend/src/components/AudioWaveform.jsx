import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  ArrowClockwise,
  Microphone,
  SpeakerHigh,
  Waveform,
} from '@phosphor-icons/react';

/**
 * Format seconds to MM:SS string with Latin digits
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds == null || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Deterministic acoustic profile pattern (36 bars) for speech waveform
const DEFAULT_BAR_HEIGHTS = [
  18, 28, 42, 65, 82, 55, 38, 72, 90, 85, 60, 44, 78, 95, 88, 64, 48, 80,
  98, 90, 70, 52, 84, 92, 75, 58, 42, 68, 86, 74, 55, 36, 48, 62, 34, 20,
];

/**
 * Interactive Audio Waveform with Frosted Glass styling & 3D Deboss/Emboss Depth
 */
export default function AudioWaveform({
  duration = 10,
  currentTime = 0,
  isPlaying = false,
  isRecording = false,
  recordingSeconds = 0,
  onSeek,
  onTogglePlay,
  title = 'Voice ADR Waveform',
  subtitle = '16kHz Gnani Timbre Audio Note',
  accentColor = 'var(--accent)',
  className = '',
}) {
  const trackRef = useRef(null);
  const [hoverPercent, setHoverPercent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [liveAmplitudes, setLiveAmplitudes] = useState(DEFAULT_BAR_HEIGHTS);

  // Animate waveform bars during active recording to simulate live microphone energy
  useEffect(() => {
    if (!isRecording) {
      setLiveAmplitudes(DEFAULT_BAR_HEIGHTS);
      return;
    }

    const interval = setInterval(() => {
      setLiveAmplitudes((prev) =>
        prev.map((base, idx) => {
          const jitter = Math.sin(Date.now() / 120 + idx * 0.7) * 22;
          const energy = Math.random() * 20;
          return Math.max(14, Math.min(100, Math.round(base * 0.6 + jitter + energy)));
        })
      );
    }, 90);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Compute active playback percentage
  const effectiveCurrent = isRecording ? recordingSeconds : currentTime;
  const effectiveDuration = isRecording ? Math.max(duration, recordingSeconds || 1) : Math.max(duration || 1, 0.1);
  const progressPercent = Math.min(100, Math.max(0, (effectiveCurrent / effectiveDuration) * 100));

  const calculatePercentFromEvent = useCallback((e) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    return pct;
  }, []);

  const handlePointerDown = (e) => {
    if (isRecording) return;
    setIsDragging(true);
    const pct = calculatePercentFromEvent(e);
    const seekTime = (pct / 100) * effectiveDuration;
    onSeek?.(seekTime);
  };

  const handlePointerMove = (e) => {
    const pct = calculatePercentFromEvent(e);
    setHoverPercent(pct);
    if (isDragging && !isRecording) {
      const seekTime = (pct / 100) * effectiveDuration;
      onSeek?.(seekTime);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleKeyDown = (e) => {
    if (isRecording) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onTogglePlay?.();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTime = Math.max(0, currentTime - 1);
      onSeek?.(nextTime);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextTime = Math.min(effectiveDuration, currentTime + 1);
      onSeek?.(nextTime);
    }
  };

  const skipRelative = (deltaSeconds) => {
    if (isRecording) return;
    const target = Math.max(0, Math.min(effectiveDuration, currentTime + deltaSeconds));
    onSeek?.(target);
  };

  return (
    <div
      className={`audio-waveform-card ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid var(--border-default)',
        background: 'var(--surface-glass, rgba(255, 254, 240, 0.85))',
      }}
    >
      {/* Waveform Header with Title & Telemetry */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '9999px',
              backgroundColor: isRecording ? 'var(--danger-tint)' : 'var(--accent-wash)',
              color: isRecording ? 'var(--danger)' : 'var(--accent)',
            }}
          >
            {isRecording ? (
              <Microphone size={14} weight="fill" />
            ) : isPlaying ? (
              <SpeakerHigh size={14} weight="fill" />
            ) : (
              <Waveform size={14} weight="regular" />
            )}
          </span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Timer Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: isRecording ? 'var(--danger-tint)' : 'var(--bg-raised)',
            border: isRecording ? '1px solid var(--danger)' : '1px solid var(--border-default)',
          }}
        >
          {isRecording && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger)',
                animation: 'voiceActivePulse 1.2s infinite ease-in-out',
              }}
            />
          )}
          <span
            className="mono-metric"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isRecording ? 'var(--danger)' : 'var(--text-primary)',
            }}
          >
            {formatTime(effectiveCurrent)} / {formatTime(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* 3D Debossed Track Container with Interactive Waveform Bars */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Interactive voice waveform scrubber"
        aria-valuemin={0}
        aria-valuemax={Math.round(effectiveDuration)}
        aria-valuenow={Math.round(effectiveCurrent)}
        aria-valuetext={`${formatTime(effectiveCurrent)} of ${formatTime(effectiveDuration)}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setHoverPercent(null);
          setIsDragging(false);
        }}
        onKeyDown={handleKeyDown}
        className="audio-waveform-track"
        style={{
          position: 'relative',
          height: '68px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          gap: '3px',
          cursor: isRecording ? 'default' : 'pointer',
          outline: 'none',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {/* Render Spectrum Bars */}
        {liveAmplitudes.map((heightPercent, idx) => {
          const barFraction = (idx / (liveAmplitudes.length - 1)) * 100;
          const isPassed = barFraction <= progressPercent;
          const isHoverCandidate = hoverPercent != null && barFraction <= hoverPercent;

          // Color calculation: speaking amber for recording energy, olive/accent for playback
          let barBg;
          if (isRecording) {
            barBg = heightPercent > 50 ? 'var(--amber)' : 'var(--accent)';
          } else if (isPassed) {
            barBg = accentColor || 'var(--accent)';
          } else if (isHoverCandidate) {
            barBg = 'var(--accent-hover, var(--border-strong))';
          } else {
            barBg = 'var(--border-strong)';
          }

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                maxWidth: '6px',
                minWidth: '2px',
                height: `${heightPercent}%`,
                maxHeight: '86%',
                backgroundColor: barBg,
                borderRadius: '9999px',
                transition: isRecording
                  ? 'height 80ms ease-out, background-color 120ms ease'
                  : 'background-color 140ms ease, height 180ms ease',
              }}
            />
          );
        })}

        {/* Scrubber Playhead Line */}
        {!isRecording && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              left: `${progressPercent}%`,
              width: '2px',
              backgroundColor: 'var(--amber)',
              borderRadius: '2px',
              pointerEvents: 'none',
              transform: 'translateX(-50%)',
              transition: isDragging ? 'none' : 'left 80ms linear',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--amber)',
              }}
            />
          </div>
        )}

        {/* Hover Scrub Preview Tooltip */}
        {hoverPercent != null && !isRecording && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: `${hoverPercent}%`,
              transform: 'translateX(-50%)',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--text-primary)',
              color: 'var(--on-accent)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              border: '1px solid var(--border-default)',
            }}
          >
            {formatTime((hoverPercent / 100) * effectiveDuration)}
          </div>
        )}
      </div>

      {/* Waveform Controls Bar: Buttons with 3D Raised-Cap Depth */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Play/Pause Button */}
          <button
            type="button"
            className={`btn ${isPlaying ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              minHeight: '34px',
              padding: '0 14px',
              fontSize: '13px',
              gap: '6px',
            }}
            onClick={onTogglePlay}
            disabled={isRecording}
            aria-label={isPlaying ? 'Pause audio note' : 'Play audio note'}
          >
            {isPlaying ? (
              <>
                <Pause size={14} weight="fill" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={14} weight="fill" aria-hidden="true" />
                <span>Play Voice Note</span>
              </>
            )}
          </button>

          {/* Quick Skip Backward / Forward */}
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            style={{ minHeight: '34px', minWidth: '34px', padding: '0 8px' }}
            onClick={() => skipRelative(-5)}
            disabled={isRecording}
            aria-label="Skip backward 5 seconds"
            title="Rewind 5s (Left Arrow)"
          >
            <ArrowCounterClockwise size={14} weight="regular" />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            style={{ minHeight: '34px', minWidth: '34px', padding: '0 8px' }}
            onClick={() => skipRelative(5)}
            disabled={isRecording}
            aria-label="Skip forward 5 seconds"
            title="Forward 5s (Right Arrow)"
          >
            <ArrowClockwise size={14} weight="regular" />
          </button>
        </div>

        {/* Audio Quality & Codec Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            className="status-badge status-good"
            style={{ fontSize: '11px', padding: '1px 8px', minHeight: '22px' }}
          >
            <span className="mono-metric">16kHz PCM • Linear16</span>
          </span>
          <span
            className="status-badge status-info"
            style={{ fontSize: '11px', padding: '1px 8px', minHeight: '22px' }}
          >
            <span>Gnani Timbre</span>
          </span>
        </div>
      </div>
    </div>
  );
}
