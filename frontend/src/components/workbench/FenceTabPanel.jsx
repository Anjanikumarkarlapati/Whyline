import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Microphone,
  Play,
  Record,
  ShieldCheck,
  ShieldWarning,
  SpeakerHigh,
  Swap,
} from '@phosphor-icons/react';
import { useWorkbenchSelection } from '../../context/WorkbenchContext';
import { useI18n } from '../../i18n';
import StatusBadge from '../StatusBadge';
import AudioWaveform from '../AudioWaveform';
import { FormattedText } from '../CodeText';

export default function FenceTabPanel() {
  const { lang, setLang, t } = useI18n();
  const { file, line, fenceId, activeDoc, selectLocation } = useWorkbenchSelection();

  const [fences, setFences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voiceInput, setVoiceInput] = useState(
    'Avunu, correct! gateway router lo retry count = 5 alage unchandi, endukante v1 midnight packet drop avtundi until application yml lo gateway dot version v2 ki marustaru.'
  );
  const [rescoreLog, setRescoreLog] = useState([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(10);
  const [toastMessage, setToastMessage] = useState('');
  const [isRecordingNew, setIsRecordingNew] = useState(false);
  const audioRef = useRef(null);

  const fileName = file.split('/').pop();

  const loadFences = async () => {
    try {
      const resp = await fetch('/api/fences');
      const data = await resp.json();
      setFences(data.fences || []);
    } catch {
      setFences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFences();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Find fence matching current selection (by id or by line range)
  const currentFence =
    fences.find((f) => f.id === fenceId) ||
    fences.find(
      (f) =>
        f.file_path?.includes(fileName) &&
        line >= (f.start_line || 0) &&
        line <= (f.end_line || 999)
    ) ||
    (activeDoc.fences && activeDoc.fences[0] && fenceId === activeDoc.fences[0].id
      ? {
          id: activeDoc.fences[0].id,
          symbol_name: `${fileName.replace('.java', '')}.dispatchSettlement()`,
          status: activeDoc.fences[0].status,
          start_line: activeDoc.fences[0].startLine,
          end_line: activeDoc.fences[0].endLine,
          matched_token: activeDoc.fences[0].token,
          reconstructed_why: activeDoc.fences[0].badge,
          danger_condition: 'Removing retry logic causes 18% midnight settlement drops under high latency.',
          expiry_condition: { description: "gateway.version == 'v2'" },
          audio_url: '/api/audio/FENCE-001.wav',
        }
      : null);

  const handlePlayAudio = (url) => {
    const targetUrl = url || currentFence?.audio_url || '/api/audio/FENCE-001.wav';
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(targetUrl);
      audioRef.current = audio;
      audio.ontimeupdate = () => setAudioCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => {
        if (audio.duration) setAudioDuration(audio.duration);
      };
      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioCurrentTime(0);
      };
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      handlePlayAudio();
    }
  };

  const handleConfirmByVoice = async () => {
    if (!currentFence?.id) return;
    try {
      const resp = await fetch(`/api/fences/${currentFence.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript_text: voiceInput,
          language: lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN',
          author_handle: '@anjani',
        }),
      });
      if (!resp.ok) throw new Error('Voice confirmation failed');
      const data = await resp.json();
      setRescoreLog(data?.stt_telemetry?.ast_replacements || []);
      await loadFences();
      showToast(`${currentFence.id} confirmed and locked in AST ledger.`);
      if (data?.fence?.audio_url) {
        handlePlayAudio(data.fence.audio_url);
      }
    } catch (err) {
      showToast(`Confirmation error: ${err.message || err}`);
    }
  };

  return (
    <div className="fence-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {toastMessage && (
        <div
          className="toast-alert"
          role="status"
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'var(--accent)',
            color: 'var(--on-accent, #FDFBD4)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Selected Location Chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="small-caps" style={{ color: 'var(--text-secondary)' }}>
            Selected Anchor:
          </span>
          <span
            className="mono-metric"
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-strong)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {fileName}:{line}
          </span>
        </div>

        {currentFence && (
          <StatusBadge status={currentFence.status || 'PENDING_CONFIRMATION'} />
        )}
      </div>

      {currentFence ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header with Title & Token */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="mono-metric" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                {currentFence.id}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>•</span>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>
                {currentFence.symbol_name || `${fileName}:${currentFence.start_line}-${currentFence.end_line}`}
              </span>
            </div>
            {currentFence.matched_token && (
              <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                Flagged token: <code style={{ color: 'var(--accent)' }}>{currentFence.matched_token}</code>
              </span>
            )}
          </div>

          {/* 36-bar Waveform Scrubber */}
          <div className="card" style={{ padding: '14px', background: 'var(--bg-surface)' }}>
            <AudioWaveform
              isPlaying={isPlayingAudio}
              currentTime={audioCurrentTime}
              duration={audioDuration}
              onTogglePlay={handleToggleAudio}
              onSeek={(seekTime) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = seekTime;
                  setAudioCurrentTime(seekTime);
                }
              }}
              title="Spoken ADR Audio (Gnani Timbre • 16kHz)"
              subtitle="PR #212 • @anjani (te-IN Nalini / hi-IN Bhavna / en-IN Pranav)"
            />
          </div>

          {/* Voice Persona & Language Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="fence-lang-select">
                Language
              </label>
              <select
                id="fence-lang-select"
                className="form-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="te">తెలుగు (te-IN • Nalini)</option>
                <option value="hi">हिंदी (hi-IN • Bhavna)</option>
                <option value="en">English (en-IN • Pranav)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Voice Model</label>
              <div
                className="form-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-raised)',
                  fontSize: '12px',
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                {lang === 'te' ? 'te-IN Nalini (Timbre v3)' : lang === 'hi' ? 'hi-IN Bhavna (Timbre v3)' : 'en-IN Pranav (Timbre v3)'}
              </div>
            </div>
          </div>

          {/* Voice Confirmation Input & Action */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" htmlFor="fence-transcript-input" style={{ margin: 0 }}>
                10-Second Voice Confirmation
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px' }}
                  onClick={() =>
                    setVoiceInput(
                      'Avunu, correct! gateway router lo retry count = 5 alage unchandi, endukante v1 midnight packet drop avtundi.'
                    )
                  }
                >
                  Load Telugu
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px' }}
                  onClick={() =>
                    setVoiceInput(
                      'Haan bilkul! GatewayRouter me retryCount = 5 rakhein jab tak gateway.version v2 deploy nahi hota.'
                    )
                  }
                >
                  Load Hindi
                </button>
              </div>
            </div>
            <textarea
              id="fence-transcript-input"
              className="form-input"
              rows={3}
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              style={{ fontSize: '13px', lineHeight: '1.5' }}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmByVoice}
            style={{ width: '100%', minHeight: '40px' }}
          >
            <Microphone size={16} weight="regular" aria-hidden="true" />
            <span>Confirm via Gnani Prisma (10s Audio)</span>
          </button>

          {/* Mitigation Metadata Accordion / Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div className="card" style={{ padding: '12px', background: 'var(--bg-surface)' }}>
              <span className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Reconstructed Why
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', lineHeight: '1.5' }}>
                <FormattedText text={currentFence.reconstructed_why || 'Protected invariant prevents recurring midnight timeout failures.'} />
              </p>
            </div>

            <div className="card" style={{ padding: '12px', background: 'var(--bg-surface)' }}>
              <span className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Danger Condition
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', lineHeight: '1.5', color: 'var(--status-critical, #B3261E)' }}>
                {currentFence.danger_condition || 'Removing this parameter causes silent packet drops in upstream gateways.'}
              </p>
            </div>

            <div className="card" style={{ padding: '12px', background: 'var(--bg-surface)' }}>
              <span className="small-caps" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Auto-Expiry Rule
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>
                {currentFence.expiry_condition?.description || currentFence.expiry_condition?.key_path || "config: gateway.version == 'v2'"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: No fence for this line */
        <div
          className="empty-fence-state card"
          style={{
            padding: '32px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            background: 'var(--bg-surface)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--bg-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <ShieldWarning size={24} weight="regular" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600 }}>
              No fence bound to {fileName}:{line}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '34ch' }}>
              Lines without fences can be freely modified by agents. Record a spoken fence to guard fragile invariants.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setIsRecordingNew(true);
              setVoiceInput(`Guarding ${fileName}:${line} for legacy timeout and compatibility.`);
              showToast(`Prepared new fence buffer for ${fileName}:${line}`);
            }}
          >
            <Record size={16} weight="fill" aria-hidden="true" />
            <span>Record a fence for this line</span>
          </button>
        </div>
      )}
    </div>
  );
}
