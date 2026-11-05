import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Microphone,
  ShieldWarning,
  SpeakerHigh,
  Swap,
  X,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import { CodeBlock, FormattedText } from '../components/CodeText';
import AudioWaveform from '../components/AudioWaveform';

export default function SpokenFencesPage() {
  const { lang, t } = useI18n();
  const [fences, setFences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gatewayVersion, setGatewayVersion] = useState('v1');
  const [junitSource, setJunitSource] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [voiceInput, setVoiceInput] = useState(
    'Avunu, correct! gateway router lo retry count = 5 alage unchandi, endukante v1 midnight packet drop avtundi until application yml lo gateway dot version v2 ki marustaru.'
  );
  const [rescoreLog, setRescoreLog] = useState([]);
  const [interceptOutput, setInterceptOutput] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(10);
  const audioRef = useRef(null);
  const drawerCloseRef = useRef(null);

  const loadFences = async () => {
    try {
      const resp = await fetch('/api/fences');
      const data = await resp.json();
      setFences(data.fences || []);
      setGatewayVersion(data.gateway_version || 'v1');
      setJunitSource(data.junit_invariant_source || '');
    } catch {
      setFences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFences();
  }, []);

  useEffect(() => {
    if (selectedId && drawerCloseRef.current) {
      drawerCloseRef.current.focus();
    }
  }, [selectedId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedId) {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const filteredFences = fences.filter((f) => {
    if (statusFilter === 'ALL') return true;
    return f.status === statusFilter;
  });

  const selectedFence = fences.find((f) => f.id === selectedId) || null;

  const handleConfirmByVoice = async () => {
    if (!selectedFence) return;
    try {
      const resp = await fetch(`/api/fences/${selectedFence.id}/confirm`, {
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
      showToast(`${selectedFence.id} confirmed by voice and locked in AST ledger.`);
      if (data?.fence?.audio_url) {
        handlePlayAudio(data.fence.audio_url);
      }
    } catch (err) {
      showToast(`Error confirming fence: ${err.message || err}`);
    }
  };

  const handlePlayAudio = (url) => {
    if (!url) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime);
      };
      audio.onloadedmetadata = () => {
        if (audio.duration) setAudioDuration(audio.duration);
      };
      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioCurrentTime(0);
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
      };
      audio.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((err) => {
        console.warn('Audio play failed:', err);
        setIsPlayingAudio(false);
      });
    } catch (err) {
      console.warn('Audio initialization failed:', err);
      setIsPlayingAudio(false);
    }
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else if (selectedFence?.audio_url) {
      handlePlayAudio(selectedFence.audio_url);
    }
  };

  const handleSimulateIntercept = async () => {
    if (!selectedFence) return;
    try {
      const resp = await fetch('/api/fences/intercept-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: selectedFence.file_path,
          proposed_diff: `- ${selectedFence.matched_token};\n+ // AI Agent cleaned up legacy workaround`,
          agent_name: 'Claude Code / Cursor Agent',
          declared_assumptions: [
            `Assumes ${selectedFence.matched_token} in ${selectedFence.method_name} is obsolete`,
          ],
        }),
      });
      if (!resp.ok) throw new Error('Intercept simulation failed');
      const data = await resp.json();
      setInterceptOutput(data.fence_check);
      if (data?.fence_check?.spoken_warning_url) {
        handlePlayAudio(data.fence_check.spoken_warning_url);
      }
    } catch (err) {
      showToast(`Error simulating agent edit: ${err.message || err}`);
    }
  };

  const handleToggleGatewayVersion = async () => {
    const nextVersion = gatewayVersion === 'v2' ? 'v1' : 'v2';
    try {
      const resp = await fetch('/api/config/gateway-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: nextVersion }),
      });
      if (!resp.ok) throw new Error('Gateway version update failed');
      await loadFences();
      showToast(`Config updated: gateway.version = ${nextVersion}`);
    } catch (err) {
      showToast(`Error toggling gateway version: ${err.message || err}`);
    }
  };

  return (
    <div className="page-stack">
      {/* Header */}
      <section className="context-header">
        <div>
          <p className="context-meta">{t('fencesContext')}</p>
          <h1 className="page-title">{t('fencesTitle')}</h1>
        </div>
        <div className="chip-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleToggleGatewayVersion}
          >
            <Swap size={16} weight="regular" aria-hidden="true" />
            <span>
              {gatewayVersion === 'v2' ? t('btnRestoreGatewayV1') : t('btnToggleGatewayV2')}
            </span>
          </button>
        </div>
      </section>

      {/* Segmented Filter Control */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div className="segmented-control" role="group" aria-label="Filter Fences by status">
          {[
            { key: 'ALL', label: `All (${fences.length})` },
            { key: 'PENDING_CONFIRMATION', label: 'Pending' },
            { key: 'UNVERIFIED_HISTORICAL', label: 'Unverified' },
            { key: 'VERIFIED_ACTIVE', label: 'Verified' },
            { key: 'EXPIRED_SAFE_TO_REMOVE', label: 'Expired' },
          ].map((seg) => (
            <button
              key={seg.key}
              type="button"
              className={`segmented-btn ${statusFilter === seg.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(seg.key)}
            >
              {seg.label}
            </button>
          ))}
        </div>

        <span className="form-helper">
          Select any row to open the Fence Detail Drawer (transcript, audio &amp; source).
        </span>
      </div>

      {/* Primary Table-First View */}
      <article className="card">
        <div className="card-header">
          <h2 className="card-title">Repository Spoken Fences</h2>
          <span className="mono-metric">{filteredFences.length} fences</span>
        </div>

        {loading ? (
          <div className="card-body">
            <div className="skeleton" style={{ height: '180px' }} />
          </div>
        ) : filteredFences.length === 0 ? (
          <div className="empty-state">No fences match the selected status filter.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('colFenceId')}</th>
                  <th>{t('colSymbol')}</th>
                  <th>{t('colAnomalyType')}</th>
                  <th>{t('colProvenance')}</th>
                  <th>{t('colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFences.map((fence) => (
                  <tr
                    key={fence.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Inspect ${fence.id} ${fence.symbol_name}`}
                    className={`clickable-row ${selectedFence?.id === fence.id ? 'selected-row' : ''}`}
                    onClick={() => {
                      setSelectedId(fence.id);
                      setInterceptOutput(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(fence.id);
                        setInterceptOutput(null);
                      }
                    }}
                  >
                    <td data-label="ID" className="mono-metric" style={{ fontWeight: 500 }}>
                      {fence.id}
                    </td>
                    <td data-label="Symbol">
                      <div style={{ fontWeight: 500, color: 'var(--ink)' }}>
                        {fence.symbol_name}
                      </div>
                      <div
                        className="mono-metric truncate-cell"
                        style={{ color: 'var(--ink-muted)', marginTop: '2px' }}
                        title={`${fence.file_path} (Lines ${fence.start_line}–${fence.end_line})`}
                      >
                        {fence.file_path}:{fence.start_line}–{fence.end_line}
                      </div>
                    </td>
                    <td data-label="Anomaly">
                      <div className="mono-metric">{fence.anomaly_type}</div>
                      <div
                        className="form-helper truncate-cell"
                        title={fence.matched_token}
                        style={{ marginTop: '2px' }}
                      >
                        <FormattedText text={`\`${fence.matched_token}\``} />
                      </div>
                    </td>
                    <td data-label="Provenance">
                      <div className="mono-metric">
                        {fence.provenance?.pr_number} • {fence.provenance?.incident_id}
                      </div>
                      <div className="form-helper" style={{ marginTop: '2px' }}>
                        {fence.author_handle} ({fence.author_active ? 'Active' : 'Departed'})
                      </div>
                    </td>
                    <td data-label="Status">
                      {/* Show status chip only when it differs from Verified Active default */}
                      <StatusBadge status={fence.status} hideIfDefault={true} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* Right-Side Detail Drawer (opens on row click) */}
      {selectedFence && (
        <div
          className="ask-drawer-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fence-drawer-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <aside className="ask-drawer-panel glass-navbar">
            <div className="ask-drawer-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="mono-metric" style={{ fontWeight: 600 }}>
                    {selectedFence.id}
                  </span>
                  <StatusBadge status={selectedFence.status} />
                </div>
                <h2 id="fence-drawer-title" className="card-title" style={{ marginTop: '4px' }}>
                  {selectedFence.symbol_name}
                </h2>
              </div>
              <button
                ref={drawerCloseRef}
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedId(null)}
                aria-label="Close fence detail drawer"
              >
                <X size={18} weight="regular" aria-hidden="true" />
                <span>Close</span>
              </button>
            </div>

            <div className="ask-drawer-body">
              {/* Provenance & Location */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--hairline)',
                  background: 'var(--canvas)',
                  fontSize: '13px',
                }}
              >
                <div>
                  <span className="small-caps">File Path</span>
                  <div className="mono-metric" style={{ marginTop: '2px' }}>
                    {selectedFence.file_path}:{selectedFence.start_line}–{selectedFence.end_line}
                  </div>
                </div>
                <div>
                  <span className="small-caps">Provenance</span>
                  <div className="mono-metric" style={{ marginTop: '2px' }}>
                    {selectedFence.provenance?.pr_number} • {selectedFence.provenance?.incident_id} •{' '}
                    {selectedFence.provenance?.commit_sha}
                  </div>
                </div>
                <div>
                  <span className="small-caps">Expiry Rule</span>
                  <div className="mono-metric" style={{ marginTop: '2px' }}>
                    {selectedFence.expiry_condition?.description}
                  </div>
                </div>
              </div>

              {/* Recorded Reason & Danger Condition */}
              <div>
                <div className="small-caps">{t('labelReconstructedWhy')}</div>
                <p className="body-prose" style={{ marginTop: '6px' }}>
                  <FormattedText text={selectedFence.reconstructed_why} />
                </p>
                <p className="form-helper" style={{ marginTop: '6px' }}>
                  PR Review ({selectedFence.provenance?.reviewer}): "
                  <FormattedText text={selectedFence.provenance?.inline_comment} />"
                </p>
              </div>

              <div className="advisory-panel">
                <div className="small-caps" style={{ color: 'var(--danger)' }}>
                  {t('labelDangerCondition')}
                </div>
                <p style={{ color: 'var(--ink)', fontWeight: 500, marginTop: '4px' }}>
                  <FormattedText text={selectedFence.danger_condition} />
                </p>
              </div>

              {/* Interactive Audio Waveform & Transcript */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  title={`Spoken ADR • ${selectedFence.id}`}
                  subtitle={`Author: ${selectedFence.author_handle} (${selectedFence.language || 'te-IN'})`}
                />
                {selectedFence.transcript ? (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <div className="small-caps" style={{ fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                      Verified Voice ADR Transcript
                    </div>
                    <p className="form-helper" style={{ color: 'var(--text-primary)', margin: 0 }}>
                      <FormattedText text={selectedFence.transcript} />
                    </p>
                  </div>
                ) : (
                  <p className="form-helper" style={{ color: 'var(--text-secondary)' }}>
                    No voice note recorded yet. Use the 10-second confirmation below to record and lock this fence.
                  </p>
                )}
              </div>

              {/* Source Code Block */}
              <CodeBlock
                label={`Source • ${selectedFence.file_path}`}
                code={selectedFence.code_snippet}
              />

              {/* 10-Second Voice Confirmation Compiler (Primary Action in Drawer) */}
              <div
                style={{
                  paddingTop: '16px',
                  borderTop: '1px solid var(--hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="small-caps">{t('labelVoicePrompt')}</span>
                  <div className="chip-row">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ minHeight: '36px', padding: '0 10px', fontSize: '12px' }}
                      onClick={() =>
                        setVoiceInput(
                          'Avunu, correct! gateway router lo retry count = 5 alage unchandi, endukante v1 midnight packet drop avtundi until application yml lo gateway dot version v2 ki marustaru.'
                        )
                      }
                    >
                      {t('btnSampleTelugu')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ minHeight: '36px', padding: '0 10px', fontSize: '12px' }}
                      onClick={() =>
                        setVoiceInput(
                          'Haan bilkul sahi, gateway router mein retry count = 5 aur timeout ms = 4500 mat hatana jab tak application yml mein gateway dot version v2 na ho jaye.'
                        )
                      }
                    >
                      {t('btnSampleHindi')}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="voice-confirm-textarea">
                    {t('placeholderVoiceText')}
                  </label>
                  <textarea
                    id="voice-confirm-textarea"
                    className="form-textarea"
                    rows={3}
                    value={voiceInput}
                    onChange={(e) => setVoiceInput(e.target.value)}
                  />
                </div>

                <div className="chip-row">
                  <button type="button" className="btn btn-primary" onClick={handleConfirmByVoice}>
                    <Microphone size={16} weight="regular" aria-hidden="true" />
                    <span>{t('btnConfirmVoice')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSimulateIntercept}
                  >
                    <ShieldWarning size={16} weight="regular" aria-hidden="true" />
                    <span>{t('btnSimulateIntercept')}</span>
                  </button>
                </div>

                {rescoreLog.length > 0 && (
                  <div className="chip-row">
                    {rescoreLog.map((item, idx) => (
                      <span key={idx} className="status-badge status-good">
                        <CheckCircle size={14} weight="fill" aria-hidden="true" />
                        <span>
                          "{item.spoken}" → {item.ast_symbol}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {interceptOutput && (
                  <div
                    className={
                      interceptOutput.decision === 'REJECT_EDIT' ? 'urgent-banner' : 'advisory-panel'
                    }
                    role="status"
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span className="mono-metric" style={{ fontWeight: 600 }}>
                          whyline-mcp: {interceptOutput.decision}
                        </span>
                        <StatusBadge status={interceptOutput.decision} />
                      </div>
                      <CodeBlock label="Intercept Verdict" code={interceptOutput.reason} />
                    </div>
                  </div>
                )}
              </div>

              {/* JUnit Invariant & Cleanup Diff */}
              {junitSource && (
                <CodeBlock
                  label={`${t('labelJunitTest')} • ${selectedFence.invariant_test_path}`}
                  code={junitSource}
                />
              )}
              {selectedFence.cleanup_diff && (
                <CodeBlock label={t('labelCleanupDiff')} code={selectedFence.cleanup_diff} />
              )}
            </div>
          </aside>
        </div>
      )}

      {toastMessage && (
        <div className="toast-banner" role="status" aria-live="polite">
          <CheckCircle size={18} weight="fill" aria-hidden="true" style={{ color: 'var(--success)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
