import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Microphone,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  Stop,
  Waveform,
} from '@phosphor-icons/react';

// Deterministic organic base heights (in %) for 28 waveform bars
const BASE_BAR_HEIGHTS = [
  28, 42, 64, 50, 78, 92, 60, 44, 72, 86, 54, 38, 68, 95,
  82, 58, 74, 88, 62, 46, 76, 90, 52, 66, 80, 48, 36, 30,
];

/**
 * Interactive Frosted-Glass & 3D Embossed Audio Waveform Component.
 * Syncs with live voice recording progress (`isRecording`, `recordingSeconds`, `maxSeconds`)
 * and audio playback / walkthrough steps (`isPlaying`, `progressPercent`, `onSeekPercent`).
 */
export default function InteractiveAudioWaveform({
  isRecording = false,
  isPlaying = false,
  recordingSeconds = 0,
  maxSeconds = 10,
  progressPercent = null,
  onToggleRecord = null,
  onFinishRecord = null,
  onTogglePlay = null,
  onSeekPercent = null,
  onPrevStep = null,
  onNextStep = null,
  stepLabel = null,
  title = 'Gnani Prisma v3.0 • Interactive Voice & Audio Waveform',
  subtitle = 'Click any 3D frequency bar to scrub progress or use voice controls',
  recordLabel = 'Record 10s Voice',
  stopRecordLabel = 'Stop Recording',
  finishRecordLabel = 'Transcribe Now',
  playLabel = 'Play Audio',
  pauseLabel = 'Pause Audio',
  compact = false,
}) {
  const [pulsePhase, setPulsePhase] = useState(0);
  const [subProgress, setSubProgress] = useState(0);
  const [manualScrubPct, setManualScrubPct] = useState(null);

  // Smooth 120ms animation tick while recording or playing so bars pulse & advance fluidly
  useEffect(() => {
    if (!isRecording && !isPlaying) {
      setPulsePhase(0);
      setSubProgress(0);
      return undefined;
    }
    const interval = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 28);
      setSubProgress((prev) => Math.min(0.95, prev + 0.14));
    }, 120);
    return () => clearInterval(interval);
  }, [isRecording, isPlaying]);

  // Reset subProgress whenever integer recordingSeconds advances
  useEffect(() => {
    setSubProgress(0);
  }, [recordingSeconds]);

  // Clear manual scrub override when live recording starts
  useEffect(() => {
    if (isRecording) {
      setManualScrubPct(null);
    }
  }, [isRecording]);

  // Compute effective 0..100 progress percentage
  const computedRecordingPct =
    maxSeconds > 0
      ? Math.min(100, Math.round(((recordingSeconds + (isRecording ? subProgress : 0)) / maxSeconds) * 100))
      : 0;

  const activeProgressPct = isRecording
    ? Math.max(8, computedRecordingPct)
    : progressPercent !== null
      ? progressPercent
      : manualScrubPct !== null
        ? manualScrubPct
        : isPlaying
          ? ((pulsePhase + 1) / BASE_BAR_HEIGHTS.length) * 100
          : 35;

  const handleBarClick = (idx) => {
    const pct = Math.round(((idx + 1) / BASE_BAR_HEIGHTS.length) * 100);
    setManualScrubPct(pct);
    if (onSeekPercent) {
      onSeekPercent(pct, idx, BASE_BAR_HEIGHTS.length);
    }
  };

  const statusText = isRecording
    ? `RECORDING LIVE • ${recordingSeconds}s / ${maxSeconds}s (${Math.min(100, Math.round((recordingSeconds / maxSeconds) * 100))}%)`
    : isPlaying
      ? `SPEAKING AUDIO • ${Math.round(activeProgressPct)}%`
      : stepLabel || `READY • ${Math.round(activeProgressPct)}%`;

  return (
    <div
      className={`waveform-glass-deck ${isRecording ? 'is-recording' : isPlaying ? 'is-playing' : ''}`}
      role="region"
      aria-label={title}
    >
      {/* Top Header Strip */}
      <div className="waveform-deck-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            className={`waveform-status-pill ${
              isRecording ? 'recording' : isPlaying ? 'playing' : 'idle'
            }`}
          >
            <Waveform size={14} weight="bold" aria-hidden="true" />
            <span className="mono-metric" style={{ fontSize: '11.5px', fontWeight: 600 }}>
              {statusText}
            </span>
          </span>
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>{title}</span>
          {!compact && (
            <span className="form-helper" style={{ fontSize: '12px' }}>
              · {subtitle}
            </span>
          )}
        </div>

        {/* Direct Accessible Transport & Recording Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {onPrevStep && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: '32px', padding: '0 10px', fontSize: '12px' }}
              onClick={onPrevStep}
              aria-label="Previous step"
            >
              <SkipBack size={13} weight="fill" aria-hidden="true" />
              <span>Prev</span>
            </button>
          )}

          {onTogglePlay && (
            <button
              type="button"
              className={isPlaying ? 'btn btn-danger' : 'btn btn-secondary'}
              style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
              onClick={onTogglePlay}
            >
              {isPlaying ? (
                <>
                  <Pause size={13} weight="fill" aria-hidden="true" />
                  <span>{pauseLabel}</span>
                </>
              ) : (
                <>
                  <Play size={13} weight="fill" aria-hidden="true" />
                  <span>{playLabel}</span>
                </>
              )}
            </button>
          )}

          {onNextStep && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: '32px', padding: '0 10px', fontSize: '12px' }}
              onClick={onNextStep}
              aria-label="Next step"
            >
              <span>Next</span>
              <SkipForward size={13} weight="fill" aria-hidden="true" />
            </button>
          )}

          {onToggleRecord && (
            <button
              type="button"
              className={isRecording ? 'btn btn-danger' : 'btn btn-primary'}
              style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
              onClick={onToggleRecord}
            >
              {isRecording ? (
                <>
                  <Stop size={13} weight="fill" aria-hidden="true" />
                  <span>
                    {stopRecordLabel} ({recordingSeconds}s/{maxSeconds}s)
                  </span>
                </>
              ) : (
                <>
                  <Microphone size={13} weight="fill" aria-hidden="true" />
                  <span>{recordLabel}</span>
                </>
              )}
            </button>
          )}

          {isRecording && onFinishRecord && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
              onClick={onFinishRecord}
            >
              <CheckCircle size={13} weight="fill" aria-hidden="true" />
              <span>{finishRecordLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3D Debossed Waveform Well with 28 Interactive 3D Embossed Frequency Bars */}
      <div
        className="waveform-3d-well"
        role="group"
        aria-label="Interactive audio frequency bars"
        style={{ height: compact ? '60px' : '74px' }}
      >
        {BASE_BAR_HEIGHTS.map((baseH, idx) => {
          const barThresholdPct = ((idx + 1) / BASE_BAR_HEIGHTS.length) * 100;
          const isFilled = barThresholdPct <= activeProgressPct;
          const isPlayhead =
            Math.abs(barThresholdPct - activeProgressPct) <= 100 / BASE_BAR_HEIGHTS.length;

          // Modulate bar height dynamically while recording or speaking
          let dynamicHeight = baseH;
          if (isRecording || isPlaying) {
            const waveOffset = Math.sin((idx + pulsePhase) * 0.65) * 22;
            dynamicHeight = Math.max(20, Math.min(98, Math.round(baseH + waveOffset)));
          }

          return (
            <button
              key={idx}
              type="button"
              className={`waveform-bar-btn ${isFilled ? 'is-filled' : ''} ${
                isPlayhead ? 'is-playhead' : ''
              } ${isRecording && isFilled ? 'is-recording-bar' : ''}`}
              style={{ height: `${dynamicHeight}%` }}
              onClick={() => handleBarClick(idx)}
              aria-label={`Scrub audio waveform to ${Math.round(barThresholdPct)}%`}
              title={`Scrub to ${Math.round(barThresholdPct)}%`}
            />
          );
        })}
      </div>

      {/* Bottom Progress Track & Telemetry Footer */}
      <div className="waveform-progress-meta">
        <div className="waveform-scrubber-track" aria-hidden="true">
          <div
            className={`waveform-scrubber-fill ${isRecording ? 'recording' : ''}`}
            style={{ width: `${Math.max(4, Math.min(100, activeProgressPct))}%` }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px',
            color: 'var(--ink-muted)',
          }}
        >
          <span className="mono-metric">
            {isRecording
              ? `Gnani Prisma v3.0 STT • Capturing voice stream (${recordingSeconds}.0s / ${maxSeconds}.0s)`
              : isPlaying
                ? 'Gnani Timbre v3.0 TTS • Synchronized neural voice output'
                : 'Interactive 3D Waveform Scrubber • Click any bar to jump'}
          </span>
          <span className="mono-metric">{Math.round(activeProgressPct)}%</span>
        </div>
      </div>
    </div>
  );
}
