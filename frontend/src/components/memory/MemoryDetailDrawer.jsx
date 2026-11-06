import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  FileCode,
  GitBranch,
  Microphone,
  Play,
  ShieldCheck,
  SpeakerHigh,
  WarningOctagon,
  X,
} from '@phosphor-icons/react';
import StatusBadge from '../StatusBadge';
import { FormattedText } from '../CodeText';
import AudioWaveform from '../AudioWaveform';

export default function MemoryDetailDrawer({ isOpen, onClose, item }) {
  const navigate = useNavigate();
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);
  const audioRef = useRef(null);
  const prevTriggerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(9);

  // Focus trap & focus restoration
  useEffect(() => {
    if (isOpen) {
      prevTriggerRef.current = document.activeElement;
      closeBtnRef.current?.focus();

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
        if (e.key === 'Tab') {
          const focusable = drawerRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusable || focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (prevTriggerRef.current && typeof prevTriggerRef.current.focus === 'function') {
          prevTriggerRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  // Cleanup audio on unmount or drawer close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const targetFile = item.file || 'src/main/java/com/healthconnect/payments/GatewayRouter.java';
  const targetLine = item.line || 23;
  const targetFence = item.linkedFenceId || item.id || 'FENCE-001';

  const handleOpenWorkbench = () => {
    onClose();
    navigate(`/studio?file=${encodeURIComponent(targetFile)}&line=${targetLine}&panel=why&fence=${encodeURIComponent(targetFence)}`);
  };

  const handlePlayAudio = () => {
    const url = item.audioUrl || '/api/audio/FENCE-001.wav';
    try {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }
      if (audioRef.current) audioRef.current.pause();
      const a = new Audio(url);
      audioRef.current = a;
      a.ontimeupdate = () => setCurrentTime(a.currentTime);
      a.onloadedmetadata = () => {
        if (a.duration) setDuration(a.duration);
      };
      a.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      a.onerror = () => setIsPlaying(false);
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Memory detail drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 28, 18, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <aside
        ref={drawerRef}
        className="memory-slide-drawer"
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          gap: '20px',
          overflowY: 'auto',
        }}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {item.type === 'incident' ? (
              <WarningOctagon size={22} weight="fill" style={{ color: 'var(--status-critical, #B3261E)' }} />
            ) : (
              <GitBranch size={22} weight="regular" style={{ color: 'var(--accent)' }} />
            )}
            <span className="mono-metric" style={{ fontWeight: 700, fontSize: '15px' }}>
              {item.id}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StatusBadge status={item.status || 'VERIFIED_ACTIVE'} />
            <button
              ref={closeBtnRef}
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={onClose}
              aria-label="Close detail drawer"
              style={{ minHeight: '32px', minWidth: '32px' }}
            >
              <X size={16} weight="regular" />
            </button>
          </div>
        </div>

        {/* Title & Service */}
        <div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontFamily: 'Crimson Text, serif' }}>
            {item.title || `${item.id} Investigation Detail`}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Service: <strong>{item.service || 'HealthConnect Payment Gateway v1'}</strong>
          </p>
        </div>

        {/* Primary CTA: Open in Workbench */}
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'var(--accent-wash)',
            border: '1px solid var(--accent)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
              <Code size={16} weight="regular" />
              <span>Target Source Code Anchor</span>
            </div>
            <span className="mono-metric" style={{ fontSize: '12px', fontWeight: 600 }}>
              {targetFile.split('/').pop()}:{targetLine}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Inspect the live guarded fence in Monaco editor with whyline audio notes and git provenance.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenWorkbench}
            style={{ width: '100%', minHeight: '38px', justifyContent: 'center' }}
          >
            <span>Open in Workbench</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Spoken Postmortem Waveform */}
        {item.postmortem && (
          <div className="card" style={{ padding: '16px', background: 'var(--bg-surface)' }}>
            <span className="small-caps" style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Spoken Audio Postmortem
            </span>
            <AudioWaveform
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onTogglePlay={handlePlayAudio}
              onSeek={(seekTime) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = seekTime;
                  setCurrentTime(seekTime);
                }
              }}
              title="15-Second Engineer Debrief"
              subtitle="@anjani • te-IN / hi-IN Audio Record"
            />
            <p style={{ margin: '12px 0 0 0', fontSize: '13px', lineHeight: '1.5', fontStyle: 'italic' }}>
              "<FormattedText text={item.postmortem} />"
            </p>
          </div>
        )}

        {/* Provenance & Linked Fence Details */}
        <div className="card" style={{ padding: '16px', background: 'var(--bg-surface)' }}>
          <span className="small-caps" style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
            Associated Metadata
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Linked Fence:</span>
              <span className="mono-metric" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                {targetFence}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pull Request:</span>
              <span className="mono-metric">PR #212</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Commit Hash:</span>
              <span className="mono-metric">17c074a</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Detection:</span>
              <span>AST Guardrail Intercept</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
