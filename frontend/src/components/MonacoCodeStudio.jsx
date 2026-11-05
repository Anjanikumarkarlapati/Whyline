import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ChatCircleText,
  FileCode,
  Info,
  ShieldCheck,
  SpeakerHigh,
} from '@phosphor-icons/react';
import { defineMonacoThemes } from '../monacoTheme';
import { useI18n } from '../i18n';
import AskRepoDrawer from './AskRepoDrawer';
import StatusBadge from './StatusBadge';
import { FormattedText } from './CodeText';
import AudioWaveform from './AudioWaveform';
import { useKbPress } from '../hooks/useKbPress';

const DEFAULT_GATEWAY_ROUTER_CODE = `package com.healthconnect.payments;

public class GatewayRouter {
    // PR #212: Workaround for Razorpay-Legacy v1 midnight settlement packet drop
    public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
        int retryCount = 5;
        long timeoutMs = 4500;
        for (int attempt = 1; attempt <= retryCount; attempt++) {
            boolean delivered = sendV1Frame(orderId, amountPaise, timeoutMs);
            if (delivered) {
                return new PaymentReceipt(orderId, "SETTLED", attempt);
            }
        }
        throw new IllegalStateException("Settlement exhausted after " + retryCount + " attempts");
    }

    private boolean sendV1Frame(String orderId, long amountPaise, long timeoutMs) {
        return orderId != null && amountPaise > 0 && timeoutMs >= 4500;
    }

    public record PaymentReceipt(String orderId, String status, int attempts) {}
}
`;

export default function MonacoCodeStudio({
  code = DEFAULT_GATEWAY_ROUTER_CODE,
  theme = 'light',
  onOpenAskDrawer,
}) {
  const { t } = useI18n();
  const [currentCode, setCurrentCode] = useState(code);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(9);
  const audioRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const mouseDownDisposableRef = useRef(null);

  useEffect(() => {
    if (code) {
      setCurrentCode(code);
    }
  }, [code]);

  useEffect(() => {
    return () => {
      if (mouseDownDisposableRef.current) {
        mouseDownDisposableRef.current.dispose();
        mouseDownDisposableRef.current = null;
      }
    };
  }, []);

  const triggerAskDrawer = (fenceId = 'FENCE-001', playAudio = true) => {
    if (onOpenAskDrawer) {
      onOpenAskDrawer(fenceId, playAudio);
    } else {
      setAutoPlayAudio(playAudio);
      setDrawerOpen(true);
    }
  };

  const handlePlayFenceAudio = () => {
    try {
      if (audioPlaying && audioRef.current) {
        audioRef.current.pause();
        setAudioPlaying(false);
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio('/api/audio/FENCE-001.wav');
      audioRef.current = audio;
      audio.ontimeupdate = () => setAudioCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => {
        if (audio.duration) setAudioDuration(audio.duration);
      };
      audio.onended = () => {
        setAudioPlaying(false);
        setAudioCurrentTime(0);
      };
      audio.onerror = () => setAudioPlaying(false);
      audio.play().then(() => {
        setAudioPlaying(true);
      }).catch((err) => {
        console.warn('Fence audio playback error:', err);
        setAudioPlaying(false);
      });
    } catch (err) {
      console.warn('Fence audio initialization error:', err);
      setAudioPlaying(false);
    }
  };

  const handleEditorWillMount = (monaco) => {
    defineMonacoThemes(monaco);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.createDecorationsCollection([
      {
        range: new monaco.Range(5, 1, 15, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'whyline-gutter-pin-verified',
          linesDecorationsClassName: 'whyline-gutter-pin-line',
          inlineClassName: 'whyline-inline-fence-highlight',
          glyphMarginHoverMessage: {
            value:
              '**Spoken Fence (FENCE-001)**: Verified Active by @anjani (PR #212).\n\n*Click to inspect Spoken ADR & play 16kHz audio note.*',
          },
        },
      },
    ]);

    if (mouseDownDisposableRef.current) {
      mouseDownDisposableRef.current.dispose();
    }

    mouseDownDisposableRef.current = editor.onMouseDown((e) => {
      const target = e.target;
      const lineNumber = target.position?.lineNumber;
      const isGutterTarget =
        target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        target.type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS ||
        target.element?.classList?.contains('whyline-gutter-pin-verified') ||
        target.element?.classList?.contains('whyline-gutter-pin-line');

      if (isGutterTarget && lineNumber >= 5 && lineNumber <= 15) {
        triggerAskDrawer('FENCE-001', true);
      }
    });
  };

  const editorThemeName = theme === 'dark' ? 'whyline-cream-dark' : 'whyline-cream-light';

  // Keyboard 3D press-effect for studio buttons
  const kbAskBanner = useKbPress(() => triggerAskDrawer('FENCE-001', true));
  const kbAskPanel = useKbPress(() => triggerAskDrawer('FENCE-001', true));
  const kbPlayAudio = useKbPress(handlePlayFenceAudio);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Friendly Developer Explanatory Callout */}
      <aside
        className="card"
        style={{
          padding: '16px 20px',
          borderLeft: '4px solid var(--accent)',
          background: 'var(--bg-surface)',
        }}
        aria-label="Developer Guide: Why this Code Studio exists"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-wash)',
              color: 'var(--accent)',
              flexShrink: 0,
              marginTop: '2px',
            }}
          >
            <Info size={18} weight="fill" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span className="small-caps" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                {t('studioDevNoteTag')}
              </span>
              <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 8px' }}>
                {t('studioProtectedHeaderBadge')}
              </span>
            </div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('studioDevNoteTitle')}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '21px', color: 'var(--text-secondary)' }}>
              {t('studioDevNoteBody')}
            </p>
          </div>
        </div>
      </aside>

      <div
        className="studio-split"
        role="group"
        aria-label="Code studio split pane — Tab moves between editor and fence note panel"
      >
      <div className="monaco-studio-wrapper">
        <div className="fence-protection-banner">
          <div className="banner-left">
            <ShieldCheck size={18} weight="fill" aria-hidden="true" />
            <span className="banner-text">{t('studioActiveGuard')}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary banner-btn"
            onClick={() => triggerAskDrawer('FENCE-001', true)}
            {...kbAskBanner}
          >
            <span>{t('studioAskCopilot')}</span>
          </button>
        </div>

        <div className="monaco-studio-toolbar">
          <div className="studio-toolbar-flex">
            <FileCode size={16} weight="regular" aria-hidden="true" />
            <span className="mono-metric studio-file-path">
              src/payments/GatewayRouter.java
            </span>
            <span className="mono-metric studio-java-info">
              • {t('studioFencedLines')}
            </span>
          </div>
          <span className="mono-metric studio-java-info">
            Java 21 • UTF-8
          </span>
        </div>

        <div className="monaco-studio-editor">
          <Editor
            height="460px"
            language="java"
            value={currentCode}
            onChange={(newVal) => setCurrentCode(newVal || '')}
            theme={editorThemeName}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorDidMount}
            options={{
              glyphMargin: true,
              lineNumbers: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              readOnly: false,
              fontFamily: "var(--font-mono), 'DM Mono', monospace",
              fontLigatures: false,
              fontSize: 13,
              lineHeight: 22,
              renderLineHighlight: 'all',
              tabSize: 4,
            }}
          />
        </div>
      </div>

      <aside className="card" aria-label="Spoken Fence Note Panel">
        <div className="card-header">
          <div>
            <span className="small-caps">{t('studioGutterNote')}</span>
            <h2 className="card-title fence-note-title">FENCE-001 • dispatchSettlement</h2>
          </div>
          <StatusBadge status="VERIFIED_ACTIVE" />
        </div>

        <div className="card-body card-body-gap-16">
          <div>
            <div className="small-caps">{t('studioRecordedReason')}</div>
            <p className="body-prose recorded-reason-text">
              <FormattedText text="Hardcoded `int retryCount = 5; long timeoutMs = 4500;` absorbs Razorpay-Legacy v1 midnight settlement TCP packet drops until `gateway.version` transitions to `v2`." />
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <AudioWaveform
              isPlaying={audioPlaying}
              currentTime={audioCurrentTime}
              duration={audioDuration}
              onTogglePlay={handlePlayFenceAudio}
              onSeek={(seekTime) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = seekTime;
                  setAudioCurrentTime(seekTime);
                }
              }}
              title={t('studioSpokenAdrAudio')}
              subtitle="PR #212 • @anjani (te-IN) • 16kHz Studio Audio"
            />
            <p className="form-helper audio-note-text" style={{ padding: '0 4px', margin: 0 }}>
              "Avunu, correct! GatewayRouter lo retryCount = 5 alage unchandi, endukante v1 midnight packet drop avtundi until application.yml lo gateway.version v2 ki marustaru."
            </p>
          </div>

          <div>
            <div className="small-caps">{t('studioProvenanceExpiry')}</div>
            <div className="provenance-grid">
              <div className="provenance-row">
                <span className="provenance-label">{t('studioOrigin')}</span>
                <span className="provenance-value">PR #212 • INC-9921 • 9f3c2a1</span>
              </div>
              <div className="provenance-row">
                <span className="provenance-label">{t('studioAuthor')}</span>
                <span className="provenance-value">@anjani (Verified Active)</span>
              </div>
              <div className="provenance-row">
                <span className="provenance-label">{t('studioExpiryCondition')}</span>
                <span className="provenance-value">gateway.version == 'v2'</span>
              </div>
            </div>
          </div>

          <div className="card-divider">
            <button
              type="button"
              className="btn btn-primary btn-full-width"
              onClick={() => triggerAskDrawer('FENCE-001', true)}
              {...kbAskPanel}
            >
              <ChatCircleText size={16} weight="regular" aria-hidden="true" />
              <span>{t('studioAskCopilot')}</span>
            </button>
          </div>
        </div>
      </aside>

      {!onOpenAskDrawer && (
        <AskRepoDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          initialFenceId="FENCE-001"
          autoPlayAudio={autoPlayAudio}
        />
      )}
      </div>
    </div>
  );
}
